const formLoc = document.getElementById("locthongke");
const baoThongKe = document.getElementById("baothongke");
const ketQua = document.getElementById("ketquathongke");
const bangThongKe = document.getElementById("bangthongke");
const dinhDang = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
let dangTai = false;

function taoThe(ten, chu, cha) {
  const the = document.createElement(ten); the.textContent = chu; cha.appendChild(the); return the;
}
function ngayViet(chu) { return chu.split("-").reverse().join("/"); }
function tienViet(so) { return dinhDang.format(Math.round(so * 1000)); }
function tienTinhDuoc(dong) {
  return dong.soDongDu === 0 && dong.soDonThieu > 0 ? "Chưa tính được" : tienViet(dong.tamTinh);
}
function hienThongKe(duLieu) {
  const tong = duLieu.tong;
  document.getElementById("tieudeky").textContent = "Từ " + ngayViet(duLieu.tuNgay) + " đến " + ngayViet(duLieu.denNgay);
  document.getElementById("sodon").textContent = tong.soDon;
  document.getElementById("soluongban").textContent = tong.soLuong;
  document.getElementById("tientinhduoc").textContent = tienTinhDuoc(tong);
  const canhBao = document.getElementById("canhbaodulieu");
  canhBao.hidden = tong.soDonThieu === 0;
  canhBao.textContent = tong.soDonThieu + " hóa đơn chưa đủ dữ liệu tính tiền (" + tong.soDongThieu +
    " dòng thiếu giá/số lượng hoặc dữ liệu không hợp lệ" + (tong.soDonRong ? ", " + tong.soDonRong + " hóa đơn chưa có thuốc" : "") +
    "). " + (tong.soDongDu ? tienViet(tong.tamTinh) + " là số tiền tính được từ các dòng hợp lệ, chưa phải tổng tiền đầy đủ của kỳ." : "Chưa tính được tiền bán thuốc của kỳ này.");
  const ghiChu = document.getElementById("ghichungay");
  ghiChu.hidden = duLieu.soDonKhongNgay === 0;
  ghiChu.textContent = "Có " + duLieu.soDonKhongNgay + " hóa đơn trong cơ sở dữ liệu chưa có ngày lập, chưa đưa vào thống kê.";
  document.getElementById("ghichutrangthai").textContent = "Thanh toán là hoàn thành và được tính vào bán hàng. Hóa đơn đã xóa không còn trong thống kê." +
    (duLieu.soDonHuy ? " Có " + duLieu.soDonHuy + " đơn đã hủy trước đây được loại khỏi doanh thu." : "");
  document.getElementById("cotky").textContent = duLieu.kieu === "thang" ? "Tháng" : "Ngày";
  document.getElementById("mota").textContent = duLieu.kieu === "thang" ? "Thống kê theo tháng lập hóa đơn" : "Thống kê theo ngày lập hóa đơn";
  bangThongKe.replaceChildren();
  for (const ky of duLieu.cacKy) {
    const dong = bangThongKe.insertRow();
    taoThe("td", ngayViet(ky.ky), dong);
    for (const so of [ky.soDon, ky.soLuong, tienTinhDuoc(ky)]) taoThe("td", so, dong).className = "so";
    const tinhTrang = taoThe("span", ky.soDonThieu ? ky.soDonThieu + " hóa đơn chưa đủ dữ liệu" : "Đủ dữ liệu", dong.insertCell());
    tinhTrang.className = "tinhtrang" + (ky.soDonThieu ? " saphet" : "");
  }
  if (!duLieu.cacKy.length) {
    const o = bangThongKe.insertRow().insertCell(); o.colSpan = 5;
    o.textContent = "Không có hóa đơn trong khoảng thời gian này. Hãy chọn khoảng ngày khác.";
  }
  ketQua.hidden = false;
}
async function taiThongKe() {
  if (dangTai || !formLoc.reportValidity()) return;
  if (formLoc.elements.tuNgay.value > formLoc.elements.denNgay.value) {
    baoThongKe.textContent = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
    baoThongKe.className = "loi"; ketQua.hidden = true; return;
  }
  const thamSo = new URLSearchParams(new FormData(formLoc));
  dangTai = true; formLoc.querySelector("fieldset").disabled = true;
  ketQua.hidden = true; baoThongKe.className = "";
  baoThongKe.textContent = "Đang tải thống kê…";
  try {
    const phanHoi = await fetch("/api/thong-ke?" + thamSo);
    if (phanHoi.status === 401) { location.replace("/dangnhap.html"); return; }
    const duLieu = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(duLieu.loi || "Không tải được thống kê.");
    hienThongKe(duLieu);
    baoThongKe.textContent = "Đã tải thống kê. Chỉ các ngày/tháng có hóa đơn được hiển thị.";
  } catch (loi) { baoThongKe.textContent = loi instanceof TypeError ? "Không kết nối được máy chủ. Hãy thử lại." : loi.message; baoThongKe.className = "loi"; }
  finally { dangTai = false; formLoc.querySelector("fieldset").disabled = false; }
}
// Mặc định thống kê tháng hiện tại theo giờ Việt Nam.
const homNay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(new Date());
const nam = homNay.find(p => p.type === "year").value;
const thang = homNay.find(p => p.type === "month").value;
formLoc.elements.tuNgay.value = nam + "-" + thang + "-01";
formLoc.elements.denNgay.value = new Date(Date.UTC(Number(nam), Number(thang), 0)).toISOString().slice(0, 10);
formLoc.addEventListener("submit", function (suKien) { suKien.preventDefault(); taiThongKe(); });
taiThongKe();
