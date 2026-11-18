// Chuyển mã khách W cũ sang dãy số; giữ nguyên khách và liên kết hóa đơn.
const assert = require('node:assert/strict');
const { sql, cauhinh } = require('./ketnoi');
const { taoMaHoaDon } = require('./dulieu');

(async function () {
  const db = await new sql.ConnectionPool(cauhinh).connect();
  const tx = new sql.Transaction(db);
  try {
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    await taoMaHoaDon(tx);
    const doc = async () => (await new sql.Request(tx).query(`
      SELECT * FROM dbo.KHACHHANG WITH (TABLOCKX,HOLDLOCK);
      SELECT * FROM dbo.HOADON;
      SELECT * FROM dbo.CHITIETHOADON;
      SELECT * FROM dbo.PHANCONG;`)).recordsets;
    const truoc = await doc();
    const khach = truoc[0];
    let so = Math.max(0, ...khach.filter(k => /^\d+$/.test(k.MAKH.trim())).map(k => Number(k.MAKH.trim())));
    const canDoi = khach.filter(k => /^W\d+$/.test(k.MAKH.trim()));
    function soDon(k) {
      return Math.min(Infinity, ...truoc[1].filter(h => h.MAKH === k.MAKH).map(h => Number(h.SOHD.trim().replace(/^HD/, '')) || Infinity));
    }
    canDoi.sort((a,b) => soDon(a) - soDon(b) || a.MAKH.localeCompare(b.MAKH));
    const doiMa = new Map();
    for (const k of canDoi) {
      const moi = String(++so).padStart(3, '0');
      if (moi.length > 10) throw new Error('Dãy mã khách hàng đã hết.');
      doiMa.set(k.MAKH.trim(), moi);
      await new sql.Request(tx).input('cu', sql.NChar(10), k.MAKH).input('moi', sql.NChar(10), moi).query(`
        INSERT dbo.KHACHHANG(MAKH,TENKH,DIACHI,SDT)
          SELECT @moi,TENKH,DIACHI,SDT FROM dbo.KHACHHANG WHERE MAKH=@cu;
        UPDATE dbo.HOADON SET MAKH=@moi WHERE MAKH=@cu;
        DELETE dbo.KHACHHANG WHERE MAKH=@cu;`);
    }
    const sau = await doc();
    const chuan = (bang, doi) => bang.map(k => {
      const dong = {...k};
      if (dong.MAKH) dong.MAKH = doi ? (doiMa.get(dong.MAKH.trim()) || dong.MAKH.trim()) : dong.MAKH.trim();
      return JSON.stringify(dong);
    }).sort();
    truoc.forEach((bang, i) => assert.deepEqual(chuan(sau[i], false), chuan(bang, true)));
    await tx.commit();
    console.log('Da doi ma va kiem tra giu nguyen du lieu:', Object.fromEntries(doiMa));
  } catch (loi) {
    try { await tx.rollback(); } catch {}
    throw loi;
  } finally { await db.close(); }
})().catch(loi => { console.error(loi.message); process.exitCode = 1; });
