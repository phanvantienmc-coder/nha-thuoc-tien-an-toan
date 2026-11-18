const { sql } = require("./ketnoi");

function docNgay(chu) {
  if (typeof chu !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(chu)) return null;
  const ngay = new Date(chu + "T00:00:00Z");
  if (!Number.isFinite(ngay.getTime()) || ngay.getUTCFullYear() < 1000 || ngay.toISOString().slice(0, 10) !== chu) return null;
  return ngay;
}

async function layThongKe(db, boLoc) {
  const { tuNgay, denNgay, kieu } = boLoc;
  const tu = docNgay(tuNgay), den = docNgay(denNgay);
  if (!tu || !den || tu > den || !["ngay", "thang"].includes(kieu)) {
    return { trangThai: 400, duLieu: { loi: "Chọn ngày bắt đầu, ngày kết thúc hợp lệ và kiểu thống kê theo ngày hoặc tháng." } };
  }
  // Gom từng hóa đơn trước. Không nối PHANCONG để tránh nhân đôi tiền/số lượng.
  const ketQua = await db.request().input("tu", sql.Date, tu).input("den", sql.Date, den).query(`
    SELECT CONVERT(VARCHAR(10), h.NGAY, 23) AS ngay,
      COUNT(c.MATHUOC) AS soDong,
      SUM(CASE WHEN c.DONGIA >= 0 AND c.SOLUONG > 0 THEN 1 ELSE 0 END) AS soDongDu,
      SUM(CASE WHEN c.SOLUONG > 0 THEN CONVERT(BIGINT, c.SOLUONG) ELSE 0 END) AS soLuong,
      SUM(CASE WHEN c.MATHUOC IS NOT NULL AND
        (c.DONGIA IS NULL OR c.DONGIA < 0 OR c.SOLUONG IS NULL OR c.SOLUONG <= 0)
        THEN 1 ELSE 0 END) AS soDongThieu,
      COALESCE(SUM(CASE WHEN c.DONGIA >= 0 AND c.SOLUONG > 0
        THEN CONVERT(DECIMAL(19,4), c.DONGIA) * CONVERT(DECIMAL(10,0), c.SOLUONG) ELSE 0 END), 0) AS tamTinh
    FROM dbo.HOADON h LEFT JOIN dbo.CHITIETHOADON c ON c.SOHD=h.SOHD
    WHERE h.NGAY >= @tu AND h.NGAY <= @den AND (h.TRANGTHAI IS NULL OR h.TRANGTHAI='hoan_thanh')
    GROUP BY h.SOHD, h.NGAY ORDER BY h.NGAY, h.SOHD;
    SELECT COUNT(*) AS so FROM dbo.HOADON WHERE NGAY IS NULL;
    SELECT COALESCE(SUM(CASE WHEN TRANGTHAI='cho_xu_ly' THEN 1 ELSE 0 END),0) AS soDonCho,
      COALESCE(SUM(CASE WHEN TRANGTHAI='da_huy' THEN 1 ELSE 0 END),0) AS soDonHuy,
      COALESCE(SUM(CASE WHEN TRANGTHAI IS NULL THEN 1 ELSE 0 END),0) AS soDonCu
    FROM dbo.HOADON WHERE NGAY>=@tu AND NGAY<=@den;`);
  const theoKy = new Map();
  const tong = { soDon: 0, soLuong: 0, tamTinh: 0, soDonThieu: 0, soDongThieu: 0, soDonRong: 0, soDongDu: 0 };
  for (const don of ketQua.recordsets[0]) {
    const ky = kieu === "thang" ? don.ngay.slice(0, 7) : don.ngay;
    if (!theoKy.has(ky)) theoKy.set(ky, { ky, soDon: 0, soLuong: 0, tamTinh: 0, soDonThieu: 0, soDongThieu: 0, soDonRong: 0, soDongDu: 0 });
    const thieu = Number(don.soDongThieu) > 0 || Number(don.soDong) === 0;
    for (const dong of [tong, theoKy.get(ky)]) {
      dong.soDon++;
      dong.soLuong += Number(don.soLuong);
      dong.tamTinh = Math.round((dong.tamTinh + Number(don.tamTinh)) * 10000) / 10000;
      dong.soDongThieu += Number(don.soDongThieu);
      dong.soDongDu += Number(don.soDongDu);
      dong.soDonThieu += thieu ? 1 : 0;
      dong.soDonRong += Number(don.soDong) === 0 ? 1 : 0;
    }
  }
  // Chỉ công bố tổng tiền đầy đủ khi mọi hóa đơn trong kỳ đủ dữ liệu.
  for (const dong of [tong, ...theoKy.values()]) dong.tongTien = dong.soDonThieu ? null : dong.tamTinh;
  return { trangThai: 200, duLieu: { tuNgay, denNgay, kieu, tong,
    cacKy: [...theoKy.values()], soDonKhongNgay: ketQua.recordsets[1][0].so,
    ...ketQua.recordsets[2][0] } };
}

module.exports = { layThongKe };
