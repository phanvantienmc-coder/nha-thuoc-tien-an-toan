// Chuyển đúng hai hóa đơn W cũ sang mã HD, giữ nguyên dữ liệu liên quan.
const assert = require("node:assert/strict");
const { sql, cauhinh } = require("./ketnoi");
const { taoMaHoaDon, laySanPham } = require("./dulieu");

(async function () {
  const db = await new sql.ConnectionPool(cauhinh).connect();
  const giaoDich = new sql.Transaction(db);
  let daKetThuc = false;
  const doiMa = {};
  try {
    await giaoDich.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    // Lấy khóa hóa đơn trước, cùng thứ tự với chức năng đặt hàng.
    await taoMaHoaDon(giaoDich);
    const trongGiaoDich = { request: () => new sql.Request(giaoDich) };
    async function docBang() {
      return (await new sql.Request(giaoDich).query(`
        SELECT * FROM dbo.HOADON;
        SELECT * FROM dbo.CHITIETHOADON;
        SELECT * FROM dbo.PHANCONG;`)).recordsets;
    }
    const truoc = await docBang();
    const tonCu = await laySanPham(trongGiaoDich);
    const maCu = ["W000000002", "W000000003"];
    const canDoi = maCu.filter(ma => truoc[0].some(dong => dong.SOHD.trim() === ma));
    if (!canDoi.length) {
      await giaoDich.rollback();
      daKetThuc = true;
      console.log("Không còn hai hóa đơn W cần chuyển. Không thay đổi dữ liệu.");
      return;
    }
    assert.equal(canDoi.length, 2, "Cần kiểm tra lại: chỉ tìm thấy một trong hai mã W.");
    for (const cu of maCu) {
      const moi = await taoMaHoaDon(giaoDich);
      assert(moi, "Dãy mã hóa đơn đã hết.");
      await new sql.Request(giaoDich).input("cu", sql.NChar(10), cu).input("moi", sql.NChar(10), moi).query(`
        INSERT dbo.HOADON(SOHD,MAKH,NGAY,TRANGTHAI)
          SELECT @moi,MAKH,NGAY,TRANGTHAI FROM dbo.HOADON WHERE SOHD=@cu;
        UPDATE dbo.CHITIETHOADON SET SOHD=@moi WHERE SOHD=@cu;
        UPDATE dbo.PHANCONG SET SOHD=@moi WHERE SOHD=@cu;
        DELETE dbo.HOADON WHERE SOHD=@cu;`);
      doiMa[cu] = moi;
    }
    const sau = await docBang();
    function chuanHoa(bang, anhXa) {
      return bang.map(function (dong) {
        const ma = dong.SOHD.trim();
        return { ...dong, SOHD: anhXa[ma] || ma };
      }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    for (let i = 0; i < truoc.length; i++) {
      assert.deepEqual(chuanHoa(sau[i], {}), chuanHoa(truoc[i], doiMa));
    }
    assert.deepEqual(await laySanPham(trongGiaoDich), tonCu);
    await giaoDich.commit();
    daKetThuc = true;
    console.log(JSON.stringify({ doiMa, kiemTra: "Giữ nguyên số hóa đơn, khách hàng, ngày, thuốc, số lượng, giá, phân công và tồn kho." }));
  } finally {
    if (!daKetThuc) { try { await giaoDich.rollback(); } catch {} }
    await db.close();
  }
})().catch(function (loi) { console.error(loi.message); process.exitCode = 1; });
