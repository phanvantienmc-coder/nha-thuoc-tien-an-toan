const { sql } = require('./ketnoi');

const { layDuocSi } = require('./duocsi-data');

async function layDonHang(db) {
  const ketQua = await db.request().query(`
    SELECT RTRIM(h.SOHD) AS maDon, CONVERT(VARCHAR(10), h.NGAY, 23) AS ngay,
      COALESCE(h.TRANGTHAI, 'cu') AS trangThai,
      RTRIM(h.MAKH) AS maKhach, k.TENKH AS hoTen, k.SDT AS dienThoai, k.DIACHI AS diaChi,
      RTRIM(c.MATHUOC) AS maThuoc, t.TENTHUOC AS tenThuoc,
      c.SOLUONG AS soLuong, c.DONGIA AS gia
    FROM dbo.HOADON h
    LEFT JOIN dbo.KHACHHANG k ON k.MAKH = h.MAKH
    LEFT JOIN dbo.CHITIETHOADON c ON c.SOHD = h.SOHD
    LEFT JOIN dbo.THUOC t ON t.MATHUOC = c.MATHUOC
    ORDER BY h.NGAY DESC, h.SOHD DESC, c.MATHUOC`);
  const danhSach = [];
  const theoMa = new Map();
  for (const dong of ketQua.recordset) {
    let don = theoMa.get(dong.maDon);
    if (!don) {
      don = { maDon: dong.maDon, ngay: dong.ngay, maKhach: dong.maKhach, trangThai: dong.trangThai,
        hoTen: dong.hoTen, dienThoai: dong.dienThoai, diaChi: dong.diaChi, hang: [], tongTien: 0, duocSi: [] };
      theoMa.set(dong.maDon, don);
      danhSach.push(don);
    }
    if (dong.maThuoc) {
      const gia = dong.gia === null ? null : Number(dong.gia);
      don.hang.push({ id: dong.maThuoc, ten: dong.tenThuoc, soLuong: dong.soLuong, gia });
      if (gia === null || dong.soLuong === null) don.tongTien = null;
      else if (don.tongTien !== null) don.tongTien += gia * dong.soLuong;
    }
  }
  // Đọc riêng để nhiều dược sĩ không nhân đôi dòng thuốc và tổng tiền của đơn.
  const phanCong = await db.request().query(`
    SELECT RTRIM(SOHD) AS maDon, RTRIM(MADUOCSI) AS maDuocSi FROM dbo.PHANCONG ORDER BY SOHD, MADUOCSI`);
  const { duocSi } = await layDuocSi(db);
  const theoDuocSi = new Map(duocSi.map(ds => [ds.id, ds]));
  for (const dong of phanCong.recordset) {
    const don = theoMa.get(dong.maDon);
    const ds = theoDuocSi.get(dong.maDuocSi);
    if (don && ds) don.duocSi.push(ds);
  }
  return { donHang: danhSach, duocSi };
}

module.exports = { layDonHang };
