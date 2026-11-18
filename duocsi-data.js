const { sql } = require("./ketnoi");

async function layDuocSi(db) {
  const ds = await db.request().query(`
    SELECT RTRIM(d.MADUOCSI) AS id, d.TENDUOCSI AS ten,
      RTRIM(d.MATHUOC) AS maThuoc, t.TENTHUOC AS tenThuoc,
      (SELECT COUNT(*) FROM dbo.PHANCONG p WHERE p.MADUOCSI=d.MADUOCSI) AS soDon
    FROM dbo.DUOCSI_CHUYENTHUOC d
    LEFT JOIN dbo.THUOC t ON t.MATHUOC=d.MATHUOC ORDER BY d.MADUOCSI`);
  const thuoc = await db.request().query(`
    SELECT RTRIM(MATHUOC) AS id, TENTHUOC AS ten FROM dbo.THUOC ORDER BY MATHUOC`);
  return { duocSi: ds.recordset, thuoc: thuoc.recordset };
}

function maHopLe(ma) {
  return typeof ma === "string" && /^[A-Z0-9_-]{1,10}$/.test(ma);
}
function ketQua(trangThai, noiDung) {
  return { trangThai, duLieu: trangThai < 400 ? { thongBao: noiDung } : { loi: noiDung } };
}

async function luuDuocSi(db, duLieu) {
  const { hanhDong, id, ten, maThuoc } = duLieu || {};
  if (hanhDong === 'xoa') {
    if (!maHopLe(id)) return ketQua(400, 'Mã dược sĩ không hợp lệ.');
    try {
      const xoa = await db.request().input('id', sql.NChar(10), id).query(`
        DELETE dbo.DUOCSI_CHUYENTHUOC
        WHERE MADUOCSI=@id AND NOT EXISTS
          (SELECT 1 FROM dbo.PHANCONG WHERE MADUOCSI=@id);`);
      if (xoa.rowsAffected[0]) return ketQua(200, 'Đã xóa dược sĩ ' + id + '.');
      const con = await db.request().input('id', sql.NChar(10), id)
        .query('SELECT MADUOCSI FROM dbo.DUOCSI_CHUYENTHUOC WHERE MADUOCSI=@id');
      return con.recordset.length
        ? ketQua(409, 'Dược sĩ đã có phân công trong hóa đơn, không thể xóa để giữ lịch sử.')
        : ketQua(404, 'Dược sĩ không còn tồn tại. Hãy tải lại danh sách.');
    } catch (loi) {
      if ((loi.number || loi.originalError?.info?.number) === 547)
        return ketQua(409, 'Dược sĩ đang được sử dụng trong dữ liệu khác, không thể xóa.');
      throw loi;
    }
  }
  if (!["them", "sua"].includes(hanhDong) || !maHopLe(id) ||
      typeof ten !== "string" || !ten.trim() || ten.length > 50 ||
      (maThuoc !== "" && !maHopLe(maThuoc))) {
    return ketQua(400, "Kiểm tra mã dược sĩ (tối đa 10 ký tự), tên (tối đa 50 ký tự) và thuốc phụ trách.");
  }
  try {
    if (maThuoc) {
      const thuoc = await db.request().input("ma", sql.NChar(10), maThuoc)
        .query("SELECT MATHUOC FROM dbo.THUOC WHERE MATHUOC=@ma");
      if (!thuoc.recordset.length) return ketQua(400, "Thuốc không tồn tại. Hãy tải lại danh sách.");
    }
    const yeuCau = db.request().input("id", sql.NChar(10), id)
      .input("ten", sql.NVarChar(50), ten.trim()).input("maThuoc", sql.NChar(10), maThuoc || null);
    const luu = await yeuCau.query(hanhDong === "them"
      ? "INSERT dbo.DUOCSI_CHUYENTHUOC(MADUOCSI,TENDUOCSI,MATHUOC) VALUES (@id,@ten,@maThuoc)"
      : "UPDATE dbo.DUOCSI_CHUYENTHUOC SET TENDUOCSI=@ten,MATHUOC=@maThuoc WHERE MADUOCSI=@id");
    if (!luu.rowsAffected[0]) return ketQua(404, "Dược sĩ không còn tồn tại. Hãy tải lại danh sách.");
    return ketQua(hanhDong === "them" ? 201 : 200, "Đã lưu thông tin dược sĩ.");
  } catch (loi) {
    const ma = loi.number || loi.originalError?.info?.number;
    if (ma === 2601 || ma === 2627) return ketQua(409, "Mã dược sĩ đã tồn tại. Chọn Sửa hoặc nhập mã khác.");
    if (ma === 547) return ketQua(400, "Thuốc phụ trách không còn tồn tại. Hãy tải lại danh sách.");
    throw loi;
  }
}

async function luuPhanCong(db, duLieu) {
  const { hanhDong, maDon, maDuocSi } = duLieu || {};
  if (!["them", "bo"].includes(hanhDong) || !maHopLe(maDon) || !maHopLe(maDuocSi)) {
    return ketQua(400, "Mã hóa đơn hoặc mã dược sĩ không hợp lệ.");
  }
  const giaoDich = new sql.Transaction(db);
  await giaoDich.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  let daKetThuc = false;
  try {
    const don = await new sql.Request(giaoDich).input("ma", sql.NChar(10), maDon)
      .query("SELECT SOHD,TRANGTHAI FROM dbo.HOADON WITH (UPDLOCK, HOLDLOCK) WHERE SOHD=@ma");
    const ds = await new sql.Request(giaoDich).input("ma", sql.NChar(10), maDuocSi)
      .query("SELECT MADUOCSI FROM dbo.DUOCSI_CHUYENTHUOC WHERE MADUOCSI=@ma");
    if (!don.recordset.length || !ds.recordset.length) {
      await giaoDich.rollback(); daKetThuc = true;
      return ketQua(404, "Hóa đơn hoặc dược sĩ không còn tồn tại. Hãy tải lại dữ liệu.");
    }
    if (don.recordset[0].TRANGTHAI === "da_huy") {
      await giaoDich.rollback(); daKetThuc = true;
      return ketQua(409, "Đơn đã hủy, không thay đổi phân công của đơn này.");
    }
    const daCo = await new sql.Request(giaoDich).input("maDon", sql.NChar(10), maDon)
      .input("maDuocSi", sql.NChar(10), maDuocSi)
      .query("SELECT SOHD FROM dbo.PHANCONG WITH (UPDLOCK, HOLDLOCK) WHERE SOHD=@maDon AND MADUOCSI=@maDuocSi");
    if (hanhDong === "them" && daCo.recordset.length) {
      await giaoDich.rollback(); daKetThuc = true;
      return ketQua(409, "Dược sĩ này đã được phân công cho hóa đơn.");
    }
    if (hanhDong === "bo" && !daCo.recordset.length) {
      await giaoDich.rollback(); daKetThuc = true;
      return ketQua(404, "Phân công này đã được bỏ. Hãy tải lại danh sách.");
    }
    await new sql.Request(giaoDich).input("maDon", sql.NChar(10), maDon).input("maDuocSi", sql.NChar(10), maDuocSi)
      .query(hanhDong === "them"
        ? "INSERT dbo.PHANCONG(SOHD,MADUOCSI) VALUES (@maDon,@maDuocSi)"
        : "DELETE dbo.PHANCONG WHERE SOHD=@maDon AND MADUOCSI=@maDuocSi");
    await giaoDich.commit(); daKetThuc = true;
    return ketQua(hanhDong === "them" ? 201 : 200, hanhDong === "them"
      ? "Đã phân công dược sĩ cho hóa đơn " + maDon + "."
      : "Đã bỏ phân công dược sĩ khỏi hóa đơn " + maDon + ".");
  } catch (loi) {
    if (!daKetThuc) { try { await giaoDich.rollback(); } catch {} }
    throw loi;
  }
}

module.exports = { layDuocSi, luuDuocSi, luuPhanCong };
