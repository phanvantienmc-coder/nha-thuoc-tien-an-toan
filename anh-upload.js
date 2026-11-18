const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function docAnh(base64) {
  if (typeof base64 !== "string" || !base64 || base64.length > 4194304 ||
      base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
  const duLieu = Buffer.from(base64, "base64");
  if (duLieu.length > 3 * 1024 * 1024 || duLieu.toString("base64") !== base64) return null;
  let duoi;
  if (duLieu.length >= 24 && duLieu.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) &&
      duLieu.subarray(-8, -4).toString() === "IEND") duoi = "png";
  else if (duLieu.length >= 4 && duLieu[0] === 255 && duLieu[1] === 216 && duLieu[2] === 255 &&
      duLieu[duLieu.length - 2] === 255 && duLieu[duLieu.length - 1] === 217) duoi = "jpg";
  else if (duLieu.length >= 20 && duLieu.subarray(0, 4).toString() === "RIFF" &&
      duLieu.subarray(8, 12).toString() === "WEBP" && duLieu.readUInt32LE(4) + 8 === duLieu.length) duoi = "webp";
  if (!duoi) return null;
  return { duLieu, duongDan: "/images/uploads/" + crypto.randomUUID() + "." + duoi };
}
function ghiAnh(anh) {
  fs.mkdirSync(path.join(__dirname, "images", "uploads"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, anh.duongDan.slice(1)), anh.duLieu, { flag: "wx" });
}
function xoaAnhThu(anh) {
  if (anh) fs.unlinkSync(path.join(__dirname, anh.duongDan.slice(1)));
}
module.exports = { docAnh, ghiAnh, xoaAnhThu };
