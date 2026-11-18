const { sql } = require('./ketnoi');

async function xoaHoaDon(db, duLieu) {
  const { maDon } = duLieu || {};
  if (typeof maDon !== 'string' || !/^[A-Z0-9_-]{1,10}$/.test(maDon)) {
    return { trangThai: 400, duLieu: { loi: 'Mã hóa đơn không hợp lệ.' } };
  }
  const tx = new sql.Transaction(db);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  let ketThuc = false;
  try {
    const don = await new sql.Request(tx).input('ma', sql.NChar(10), maDon)
      .query('SELECT SOHD FROM dbo.HOADON WITH (TABLOCKX,HOLDLOCK) WHERE SOHD=@ma');
    if (!don.recordset.length) {
      await tx.rollback(); ketThuc = true;
      return { trangThai: 404, duLieu: { loi: 'Hóa đơn không còn tồn tại. Hãy tải lại danh sách.' } };
    }
    const hang = await new sql.Request(tx).input('ma', sql.NChar(10), maDon)
      .query('SELECT MATHUOC FROM dbo.CHITIETHOADON WHERE SOHD=@ma ORDER BY MATHUOC');
    for (const mon of hang.recordset) {
      await new sql.Request(tx).input('ma', sql.NChar(10), mon.MATHUOC)
        .query('SELECT MATHUOC FROM dbo.THUOC WITH (UPDLOCK,HOLDLOCK) WHERE MATHUOC=@ma');
    }
    // Xóa bảng con trước; giữ hồ sơ khách hàng để dùng cho các hóa đơn khác.
    await new sql.Request(tx).input('ma', sql.NChar(10), maDon).query(`
      DELETE dbo.PHANCONG WHERE SOHD=@ma;
      DELETE dbo.CHITIETHOADON WHERE SOHD=@ma;
      DELETE dbo.HOADON WHERE SOHD=@ma;`);
    await tx.commit(); ketThuc = true;
    return { trangThai: 200, duLieu: { thongBao: 'Đã xóa hóa đơn ' + maDon + '. Tồn kho và thống kê đã được tính lại.' } };
  } catch (loi) {
    if (!ketThuc) { try { await tx.rollback(); } catch {} }
    throw loi;
  }
}
module.exports = { xoaHoaDon };
