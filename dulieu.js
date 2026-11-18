const { sql } = require("./ketnoi");

// Kho trong bài học: tổng nhập - tổng đã bán.
const cotTonKho = `
  COALESCE((SELECT SUM(CONVERT(BIGINT, SOLUONGNHAP))
    FROM dbo.CHITIETPHIEUNHAP WHERE MATHUOC = t.MATHUOC), 0)
  - COALESCE((SELECT SUM(CONVERT(BIGINT, c.SOLUONG))
    FROM dbo.CHITIETHOADON c JOIN dbo.HOADON h ON h.SOHD=c.SOHD
    WHERE c.MATHUOC = t.MATHUOC AND (h.TRANGTHAI IS NULL OR h.TRANGTHAI <> 'da_huy')), 0)`;

async function laySanPham(db) {
  const thuoc = await db.request().query(`
    SELECT RTRIM(t.MATHUOC) AS id, COALESCE(t.TENTHUOC, RTRIM(t.MATHUOC)) AS ten,
      t.DONGIA AS gia, t.ANH AS anh, ${cotTonKho} AS ton,
      COALESCE(l.TENLOAI, N'Chưa phân loại') AS nhom
    FROM dbo.THUOC t
    LEFT JOIN dbo.LOAITHUOC l ON t.MALOAI = l.MALOAI
    ORDER BY t.MATHUOC`);
  const loai = await db.request().query(`
    SELECT TENLOAI AS ten FROM dbo.LOAITHUOC WHERE TENLOAI IS NOT NULL
    UNION SELECT N'Chưa phân loại' WHERE EXISTS (
      SELECT 1 FROM dbo.THUOC t LEFT JOIN dbo.LOAITHUOC l ON t.MALOAI=l.MALOAI
      WHERE l.TENLOAI IS NULL)`);
  return {
    sanPham: thuoc.recordset.map(function (mon) {
      return { ...mon, gia: Number(mon.gia), ton: Math.max(0, Number(mon.ton)) };
    }),
    danhMuc: loai.recordset
  };
}

async function taoMaHoaDon(giaoDich) {
  // Giữ khóa đến hết giao dịch để hai đơn cùng lúc không lấy trùng mã.
  const ketQua = await new sql.Request(giaoDich).query(`
    SELECT COALESCE(MAX(TRY_CONVERT(BIGINT, SUBSTRING(RTRIM(SOHD), 3, 8))), 0) AS soCuoi
    FROM dbo.HOADON WITH (TABLOCKX, HOLDLOCK)
    WHERE SOHD LIKE 'HD%' AND LEN(RTRIM(SOHD)) > 2
      AND SUBSTRING(RTRIM(SOHD), 3, 8) NOT LIKE '%[^0-9]%'`);
  const daDung = await new sql.Request(giaoDich).query(
    'SELECT SOCUOI AS soCuoi FROM dbo.SoHoaDonWeb WITH (UPDLOCK,HOLDLOCK) WHERE ID=1');
  const soMoi = Math.max(Number(ketQua.recordset[0].soCuoi), Number(daDung.recordset[0].soCuoi)) + 1;
  if (soMoi > 99999999) return null; // SOHD hiện chỉ chứa tối đa 10 ký tự.
  await new sql.Request(giaoDich).input('so', sql.BigInt, soMoi)
    .query('UPDATE dbo.SoHoaDonWeb SET SOCUOI=@so WHERE ID=1');
  return "HD" + String(soMoi).padStart(2, "0");
}

async function luuDon(db, don) {
  const { hoTen, dienThoai, diaChi, hang } = don || {};
  if (typeof hoTen !== "string" || !hoTen.trim() || hoTen.length > 30 ||
      typeof dienThoai !== "string" || !/^\d{9,11}$/.test(dienThoai.trim()) ||
      typeof diaChi !== "string" || !diaChi.trim() || diaChi.length > 30 ||
      !Array.isArray(hang) || hang.length < 1 || hang.length > 100) {
    return { trangThai: 400, duLieu: { loi: "Tên và địa chỉ tối đa 30 ký tự; số điện thoại từ 9 đến 11 chữ số." } };
  }
  const daCo = new Set();
  for (const mon of hang) {
    if (!mon || typeof mon.id !== "string" || !mon.id.trim() || mon.id.length > 10 ||
        !Number.isInteger(mon.soLuong) || mon.soLuong < 1 || mon.soLuong > 2147483647 || daCo.has(mon.id)) {
      return { trangThai: 400, duLieu: { loi: "Mã thuốc hoặc số lượng không hợp lệ." } };
    }
    daCo.add(mon.id);
  }

  const giaoDich = new sql.Transaction(db);
  await giaoDich.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  let daKetThuc = false;
  try {
    const maDon = await taoMaHoaDon(giaoDich);
    if (!maDon) {
      await giaoDich.rollback();
      daKetThuc = true;
      return { trangThai: 409, duLieu: { loi: "Dãy mã hóa đơn đã hết. Vui lòng liên hệ nhân viên." } };
    }
    let tongTien = 0;
    const chiTiet = [];
    // Khóa theo cùng thứ tự mã thuốc để hai đơn không cùng bán vượt tồn kho.
    for (const dong of [...hang].sort(function (a, b) { return a.id.localeCompare(b.id); })) {
      const ketQua = await new sql.Request(giaoDich)
        .input("id", sql.NChar(10), dong.id)
        .query(`SELECT DONGIA AS gia, ${cotTonKho} AS ton
          FROM dbo.THUOC t WITH (UPDLOCK, HOLDLOCK) WHERE t.MATHUOC = @id`);
      const mon = ketQua.recordset[0];
      if (!mon || Number(mon.ton) < dong.soLuong || Number(mon.gia) < 0) {
        await giaoDich.rollback();
        daKetThuc = true;
        return { trangThai: 409, duLieu: { loi: "Thuốc không còn đủ số lượng hoặc giá không hợp lệ. Hãy tải lại trang." } };
      }
      tongTien += Number(mon.gia) * dong.soLuong;
      chiTiet.push({ ...dong, gia: Number(mon.gia) });
    }
    // Tiếp tục dãy mã khách hàng 001, 002… trong cơ sở dữ liệu.
    const ma = await new sql.Request(giaoDich).query(`
      SELECT COALESCE(MAX(TRY_CONVERT(BIGINT, RTRIM(MAKH))), 0) + 1 AS soMoi
      FROM dbo.KHACHHANG WITH (TABLOCKX, HOLDLOCK)
      WHERE RTRIM(MAKH) <> '' AND RTRIM(MAKH) NOT LIKE '%[^0-9]%';`);
    const soKhach = Number(ma.recordset[0].soMoi);
    if (soKhach > 9999999999) {
      await giaoDich.rollback();
      daKetThuc = true;
      return { trangThai: 409, duLieu: { loi: "Dãy mã khách hàng đã hết. Vui lòng liên hệ nhân viên." } };
    }
    const maKhach = String(soKhach).padStart(3, "0");
    await new sql.Request(giaoDich)
      .input("maKhach", sql.NChar(10), maKhach)
      .input("maDon", sql.NChar(10), maDon)
      .input("hoTen", sql.NVarChar(30), hoTen.trim())
      .input("diaChi", sql.NVarChar(30), diaChi.trim())
      .input("dienThoai", sql.VarChar(11), dienThoai.trim())
      .query(`INSERT INTO dbo.KHACHHANG (MAKH, TENKH, DIACHI, SDT)
        VALUES (@maKhach, @hoTen, @diaChi, @dienThoai);
        INSERT INTO dbo.HOADON (SOHD, MAKH, NGAY, TRANGTHAI)
        VALUES (@maDon, @maKhach, CONVERT(DATE, DATEADD(HOUR, 7, SYSUTCDATETIME())), 'hoan_thanh');`);
    for (const mon of chiTiet) {
      await new sql.Request(giaoDich)
        .input("maDon", sql.NChar(10), maDon)
        .input("id", sql.NChar(10), mon.id)
        .input("soLuong", sql.Int, mon.soLuong)
        .input("gia", sql.Money, mon.gia)
        .query(`INSERT INTO dbo.CHITIETHOADON (SOHD, MATHUOC, SOLUONG, DONGIA)
          VALUES (@maDon, @id, @soLuong, @gia)`);
    }
    // Đối chiếu thuốc của đơn với thuốc dược sĩ phụ trách, lưu cùng giao dịch.
    await new sql.Request(giaoDich).input('maDon', sql.NChar(10), maDon).query(`
      INSERT dbo.PHANCONG(SOHD,MADUOCSI)
      SELECT DISTINCT c.SOHD,d.MADUOCSI
      FROM dbo.CHITIETHOADON c
      JOIN dbo.DUOCSI_CHUYENTHUOC d ON d.MATHUOC=c.MATHUOC
      WHERE c.SOHD=@maDon
        AND NOT EXISTS(SELECT 1 FROM dbo.PHANCONG p
          WHERE p.SOHD=c.SOHD AND p.MADUOCSI=d.MADUOCSI);`);
    await giaoDich.commit();
    daKetThuc = true;
    return { trangThai: 201, duLieu: { maDon: maDon.trim(), tongTien } };
  } catch (loi) {
    if (!daKetThuc) {
      try { await giaoDich.rollback(); } catch { /* SQL Server có thể đã tự hủy giao dịch. */ }
    }
    throw loi;
  }
}

module.exports = { laySanPham, luuDon, taoMaHoaDon };
