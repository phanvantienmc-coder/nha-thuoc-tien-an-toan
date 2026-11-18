const { sql } = require("./ketnoi");

async function layNhapKho(db) {
  const nhaCungCap = await db.request().query(`
    SELECT RTRIM(MANCC) AS id, COALESCE(TENNCC, RTRIM(MANCC)) AS ten
    FROM dbo.NHACUNGCAP ORDER BY MANCC`);
  const phieu = await db.request().query(`
    SELECT RTRIM(p.SOPN) AS soPhieu,
      CONVERT(VARCHAR(10), p.NGAYNHAP, 23) AS ngayNhap,
      RTRIM(p.MANCC) AS maNCC, COALESCE(n.TENNCC, RTRIM(p.MANCC)) AS nhaCungCap
    FROM dbo.PHIEUNHAP p LEFT JOIN dbo.NHACUNGCAP n ON p.MANCC=n.MANCC
    ORDER BY p.NGAYNHAP DESC, p.SOPN DESC`);
  // Lấy chi tiết bằng tham số, chỉ cho các phiếu trong danh sách vừa đọc.
  for (const dong of phieu.recordset) {
    const chiTiet = await db.request().input("soPhieu", sql.NChar(10), dong.soPhieu)
      .query(`SELECT RTRIM(ct.MATHUOC) AS id, COALESCE(t.TENTHUOC, RTRIM(ct.MATHUOC)) AS ten,
          ct.SOLUONGNHAP AS soLuong, ct.GIANHAP AS giaNhap
        FROM dbo.CHITIETPHIEUNHAP ct LEFT JOIN dbo.THUOC t ON ct.MATHUOC=t.MATHUOC
        WHERE ct.SOPN=@soPhieu ORDER BY ct.MATHUOC`);
    dong.hang = chiTiet.recordset;
    dong.tongTien = dong.hang.reduce(function (tong, mon) {
      return tong + Number(mon.soLuong || 0) * Number(mon.giaNhap || 0);
    }, 0);
  }
  return { nhaCungCap: nhaCungCap.recordset, phieuNhap: phieu.recordset };
}

async function luuPhieuNhap(db, phieu) {
  if (phieu?.hanhDong === 'xoa') return xoaPhieuNhap(db, phieu.soPhieu);
  const { soPhieu, maNCC, ngayNhap, hang } = phieu || {};
  const maHopLe = /^[A-Z0-9_-]{1,10}$/;
  const ngay = typeof ngayNhap === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ngayNhap)
    ? new Date(ngayNhap + "T00:00:00Z") : null;
  if (typeof soPhieu !== "string" || !maHopLe.test(soPhieu) ||
      typeof maNCC !== "string" || !maHopLe.test(maNCC) ||
      !ngay || !Number.isFinite(ngay.getTime()) || ngay.getUTCFullYear() < 1000 ||
      ngay.toISOString().slice(0, 10) !== ngayNhap ||
      !Array.isArray(hang) || hang.length < 1 || hang.length > 100) {
    return { trangThai: 400, duLieu: { loi: "Kiểm tra số phiếu (tối đa 10 ký tự), nhà cung cấp, ngày nhập và danh sách thuốc." } };
  }
  const daCo = new Set();
  let tongXu = 0;
  for (const mon of hang) {
    if (!mon || typeof mon.id !== "string" || !maHopLe.test(mon.id) || daCo.has(mon.id) ||
        !Number.isInteger(mon.soLuong) || mon.soLuong < 1 || mon.soLuong > 2147483647 ||
        typeof mon.giaNhap !== "number" || !Number.isFinite(mon.giaNhap) ||
        mon.giaNhap < 0 || mon.giaNhap > 999999999.99 ||
        Math.abs(mon.giaNhap * 100 - Math.round(mon.giaNhap * 100)) > 0.0001) {
      return { trangThai: 400, duLieu: { loi: "Mỗi thuốc chỉ chọn một lần; số lượng phải là số nguyên dương, giá nhập không âm và tối đa 2 chữ số thập phân." } };
    }
    daCo.add(mon.id);
    tongXu += mon.soLuong * Math.round(mon.giaNhap * 100);
    if (!Number.isSafeInteger(tongXu)) {
      return { trangThai: 400, duLieu: { loi: "Tổng tiền quá lớn. Hãy chia thành các phiếu nhỏ hơn." } };
    }
  }

  const giaoDich = new sql.Transaction(db);
  await giaoDich.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const trung = await new sql.Request(giaoDich).input("soPhieu", sql.NChar(10), soPhieu)
      .query("SELECT SOPN FROM dbo.PHIEUNHAP WITH (UPDLOCK, HOLDLOCK) WHERE SOPN=@soPhieu");
    if (trung.recordset.length) {
      await giaoDich.rollback();
      return { trangThai: 409, duLieu: { loi: "Số phiếu đã tồn tại. Hãy nhập số phiếu khác." } };
    }
    const ncc = await new sql.Request(giaoDich).input("maNCC", sql.NChar(10), maNCC)
      .query("SELECT MANCC FROM dbo.NHACUNGCAP WHERE MANCC=@maNCC");
    if (!ncc.recordset.length) {
      await giaoDich.rollback();
      return { trangThai: 400, duLieu: { loi: "Nhà cung cấp không tồn tại. Hãy tải lại trang." } };
    }
    // Khóa thuốc theo cùng thứ tự như lúc bán hàng.
    for (const mon of [...hang].sort(function (a, b) { return a.id.localeCompare(b.id); })) {
      const thuoc = await new sql.Request(giaoDich).input("id", sql.NChar(10), mon.id)
        .query("SELECT MATHUOC FROM dbo.THUOC WITH (UPDLOCK, HOLDLOCK) WHERE MATHUOC=@id");
      if (!thuoc.recordset.length) {
        await giaoDich.rollback();
        return { trangThai: 400, duLieu: { loi: "Thuốc " + mon.id + " không tồn tại. Hãy tải lại danh sách." } };
      }
    }
    await new sql.Request(giaoDich)
      .input("soPhieu", sql.NChar(10), soPhieu)
      .input("maNCC", sql.NChar(10), maNCC)
      .input("ngayNhap", sql.Date, ngay)
      .query("INSERT INTO dbo.PHIEUNHAP (SOPN, NGAYNHAP, MANCC) VALUES (@soPhieu, @ngayNhap, @maNCC)");
    for (const mon of hang) {
      await new sql.Request(giaoDich)
        .input("soPhieu", sql.NChar(10), soPhieu)
        .input("id", sql.NChar(10), mon.id)
        .input("soLuong", sql.Int, mon.soLuong)
        .input("giaNhap", sql.Decimal(18, 2), mon.giaNhap)
        .query(`INSERT INTO dbo.CHITIETPHIEUNHAP (SOPN, MATHUOC, SOLUONGNHAP, GIANHAP)
          VALUES (@soPhieu, @id, @soLuong, @giaNhap)`);
    }
    await giaoDich.commit();
    return { trangThai: 201, duLieu: { soPhieu, tongTien: tongXu / 100 } };
  } catch (loi) {
    try { await giaoDich.rollback(); } catch { /* Giao dịch có thể đã bị SQL Server hủy. */ }
    throw loi;
  }
}

async function xoaPhieuNhap(db, soPhieu) {
  if (typeof soPhieu !== 'string' || !/^[A-Z0-9_-]{1,10}$/.test(soPhieu))
    return {trangThai:400,duLieu:{loi:'Số phiếu nhập không hợp lệ.'}};
  const tx = new sql.Transaction(db);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  let ketThuc = false;
  try {
    // Khóa hóa đơn trước thuốc, cùng thứ tự với thanh toán và xóa hóa đơn.
    await new sql.Request(tx).query('SELECT SOHD FROM dbo.HOADON WITH (TABLOCKX,HOLDLOCK)');
    const phieu = await new sql.Request(tx).input('ma',sql.NChar(10),soPhieu)
      .query('SELECT SOPN FROM dbo.PHIEUNHAP WITH (UPDLOCK,HOLDLOCK) WHERE SOPN=@ma');
    if (!phieu.recordset.length) {
      await tx.rollback(); ketThuc = true;
      return {trangThai:404,duLieu:{loi:'Phiếu nhập không còn tồn tại. Hãy tải lại danh sách.'}};
    }
    const hang = await new sql.Request(tx).input('ma',sql.NChar(10),soPhieu)
      .query('SELECT DISTINCT MATHUOC FROM dbo.CHITIETPHIEUNHAP WHERE SOPN=@ma ORDER BY MATHUOC');
    for (const mon of hang.recordset) await new sql.Request(tx).input('id',sql.NChar(10),mon.MATHUOC)
      .query('SELECT MATHUOC FROM dbo.THUOC WITH (UPDLOCK,HOLDLOCK) WHERE MATHUOC=@id');
    await new sql.Request(tx).input('ma',sql.NChar(10),soPhieu).query(`
      DELETE dbo.CHITIETPHIEUNHAP WHERE SOPN=@ma;
      DELETE dbo.PHIEUNHAP WHERE SOPN=@ma;`);
    // Kiểm tra tồn thực sau xóa, không dùng số đã chặn về 0 của trang bán hàng.
    for (const mon of hang.recordset) {
      const ton = await new sql.Request(tx).input('id',sql.NChar(10),mon.MATHUOC).query(`
        SELECT COALESCE((SELECT SUM(CONVERT(BIGINT,SOLUONGNHAP))
          FROM dbo.CHITIETPHIEUNHAP WHERE MATHUOC=@id),0)
        - COALESCE((SELECT SUM(CONVERT(BIGINT,c.SOLUONG))
          FROM dbo.CHITIETHOADON c JOIN dbo.HOADON h ON h.SOHD=c.SOHD
          WHERE c.MATHUOC=@id AND(h.TRANGTHAI IS NULL OR h.TRANGTHAI<>'da_huy')),0) AS conLai`);
      if (Number(ton.recordset[0].conLai) < 0) {
        await tx.rollback(); ketThuc = true;
        return {trangThai:409,duLieu:{loi:'Không thể xóa: thuốc ' + mon.MATHUOC.trim() + ' sẽ bị âm tồn kho. Phiếu nhập được giữ nguyên.'}};
      }
    }
    await tx.commit(); ketThuc = true;
    return {trangThai:200,duLieu:{thongBao:'Đã xóa phiếu nhập ' + soPhieu + '. Tồn kho đã được tính lại.'}};
  } catch (loi) {
    if (!ketThuc) { try { await tx.rollback(); } catch {} }
    throw loi;
  }
}

module.exports = { layNhapKho, luuPhieuNhap };
