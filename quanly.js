let duLieu = { thuoc: [], loai: [], nhaCungCap: [] };
let coDuLieu = false;
let dangTai = false;
let dangLuu = false;
const baoQuanLy = document.getElementById("baoquanly");
const taiLai = document.getElementById("tailai");
const timThuoc = document.getElementById("timthuoc");
const locLoai = document.getElementById("locloai");
const locTon = document.getElementById("locton");
const nguongTon = document.getElementById("nguongton");
const formThuoc = document.getElementById("formthuoc");
const anhMoi = document.getElementById("anhmoi");
const xemAnh = document.getElementById("xemanhthuoc");
const moTaAnh = document.getElementById("motaAnh");
let anhTam = "";
const formLoai = document.getElementById("formloai");
const formNcc = document.getElementById("formncc");
const dinhDang = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

function tienViet(gia) {
  return dinhDang.format(Math.round(gia * 1000));
}
function boDau(chu) {
  return String(chu || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
function taoThe(ten, noiDung, cha) {
  const the = document.createElement(ten);
  the.textContent = noiDung;
  cha.appendChild(the);
  return the;
}
function thongBao(the, noiDung, loi = false) {
  the.textContent = noiDung;
  the.classList.toggle("loi", loi);
}
function khoaForm() {
  const khoa = !coDuLieu || dangTai || dangLuu;
  document.querySelectorAll(".quanly fieldset").forEach(function (the) { the.disabled = khoa; });
  document.querySelectorAll("[data-sua], [data-them], [data-xoathuoc]").forEach(function (nut) { nut.disabled = khoa; });
  taiLai.disabled = dangTai || dangLuu;
}
async function goiApi(url, duLieuGui) {
  const phanHoi = await fetch(url, duLieuGui ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(duLieuGui)
  } : {});
  if (phanHoi.status === 401) {
    location.replace("/dangnhap.html");
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  const ketQua = await phanHoi.json();
  if (!phanHoi.ok) throw new Error(ketQua.loi || "Không lưu được dữ liệu. Hãy thử lại.");
  return ketQua;
}

function hienMuc() {
  const ma = ["thuoc", "loai", "nhacungcap"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "thuoc";
  for (const ten of ["thuoc", "loai", "nhacungcap"]) document.getElementById(ten).hidden = ten !== ma;
  document.querySelectorAll(".mucquanly a").forEach(function (a) {
    if (a.hash === "#" + ma) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
}
function themNutSua(dong, loai, ma, ten) {
  const o = dong.insertCell();
  const nut = taoThe("button", "Sửa", o);
  nut.type = "button";
  nut.className = "nutphu";
  nut.dataset.sua = loai;
  nut.dataset.ma = ma;
  nut.setAttribute("aria-label", "Sửa " + (ten || ma));
}
function tinhTrang(mon) {
  const nguong = Number(nguongTon.value);
  const so = Number.isInteger(nguong) && nguong > 0 ? nguong : 20;
  if (mon.ton < 0) return { ma: "lech", ten: "Lệch tồn kho" };
  if (mon.ton === 0) return { ma: "het", ten: "Hết hàng" };
  if (mon.ton <= so) return { ma: "saphet", ten: "Sắp hết" };
  return { ma: "con", ten: "Còn hàng" };
}
function hienThuoc() {
  const bang = document.getElementById("bangthuoc");
  bang.replaceChildren();
  const tuKhoa = boDau(timThuoc.value.trim());
  const danhSach = duLieu.thuoc.filter(function (mon) {
    return boDau(mon.id + " " + (mon.ten || "")).includes(tuKhoa) &&
      (!locLoai.value || mon.maLoai === locLoai.value) && (!locTon.value || tinhTrang(mon).ma === locTon.value);
  });
  document.getElementById("demthuoc").textContent = "Hiển thị " + danhSach.length + "/" + duLieu.thuoc.length + " thuốc.";
  for (const mon of danhSach) {
    const dong = bang.insertRow();
    const ten = dong.insertCell();
    taoThe("strong", mon.ten || "Chưa có tên", ten);
    taoThe("small", mon.id, ten);
    taoThe("td", mon.nhom || "Chưa phân loại", dong);
    for (const giaTri of [tienViet(mon.gia), mon.daNhap, mon.daBan, mon.ton]) {
      taoThe("td", giaTri, dong).className = "so";
    }
    const trangThai = tinhTrang(mon);
    taoThe("span", trangThai.ten, dong.insertCell()).className = "tinhtrang " + trangThai.ma;
    themNutSua(dong, "thuoc", mon.id, mon.ten);
    const xoa = taoThe('button', 'Xóa', dong.lastElementChild);
    xoa.type = 'button'; xoa.className = 'nutphu'; xoa.dataset.xoathuoc = mon.id;
    xoa.setAttribute('aria-label', 'Xóa thuốc ' + (mon.ten || mon.id));
  }
  if (!danhSach.length) {
    const o = bang.insertRow().insertCell();
    o.colSpan = 8;
    o.textContent = "Chưa có thuốc phù hợp. Thử đổi bộ lọc hoặc thêm thuốc mới bên dưới.";
  }
  khoaForm();
}
function hienLoai() {
  const bang = document.getElementById("bangloai");
  bang.replaceChildren();
  for (const loai of duLieu.loai) {
    const dong = bang.insertRow();
    taoThe("td", loai.id, dong);
    taoThe("td", loai.ten || "Chưa có tên", dong);
    taoThe("td", duLieu.thuoc.filter(mon => mon.maLoai === loai.id).length, dong).className = "so";
    themNutSua(dong, "loai", loai.id, loai.ten);
  }
  if (!duLieu.loai.length) {
    const o = bang.insertRow().insertCell(); o.colSpan = 4;
    o.textContent = "Chưa có loại thuốc. Thêm loại đầu tiên ở bên dưới.";
  }
}

document.getElementById('bangthuoc').addEventListener('click', async function (suKien) {
  const nut = suKien.target.closest('button[data-xoathuoc]');
  if (!nut || dangTai || dangLuu) return;
  const mon = duLieu.thuoc.find(t => t.id === nut.dataset.xoathuoc);
  if (!mon) return;
  if (!window.confirm('Xóa thuốc ' + mon.id + ' · ' + (mon.ten || '') + '? Không thể hoàn tác. Thuốc đã có dữ liệu liên quan sẽ không được xóa.')) return;
  dangLuu = true; khoaForm(); thongBao(baoQuanLy, 'Đang xóa thuốc…');
  let daXoa = false;
  try {
    const ketQua = await goiApi('/api/quan-ly/thuoc', {hanhDong:'xoa',id:mon.id}); daXoa = true;
    if (formThuoc.dataset.hanhDong === 'sua' && formThuoc.elements.id.value === mon.id) datLaiForm('thuoc');
    await taiDuLieu();
    thongBao(baoQuanLy, ketQua.thongBao);
  } catch (loi) { thongBao(baoQuanLy, daXoa ? 'Đã xóa thuốc nhưng chưa tải lại được danh sách. Bấm Tải lại dữ liệu để kiểm tra.' : loi.message, true); }
  finally { dangLuu = false; khoaForm(); }
});
function hienNcc() {
  const bang = document.getElementById("bangncc");
  bang.replaceChildren();
  for (const ncc of duLieu.nhaCungCap) {
    const dong = bang.insertRow();
    for (const chu of [ncc.id, ncc.ten, ncc.diaChi, ncc.dienThoai]) taoThe("td", chu || "Chưa có dữ liệu", dong);
    themNutSua(dong, "ncc", ncc.id, ncc.ten);
  }
  if (!duLieu.nhaCungCap.length) {
    const o = bang.insertRow().insertCell(); o.colSpan = 5;
    o.textContent = "Chưa có nhà cung cấp. Thêm đơn vị cung cấp thuốc ở bên dưới.";
  }
}
function hienChonLoai() {
  for (const select of [locLoai, formThuoc.elements.maLoai]) {
    const daChon = select.value;
    select.replaceChildren();
    taoThe("option", select === locLoai ? "Tất cả loại" : "Chọn loại thuốc", select).value = "";
    for (const loai of duLieu.loai) taoThe("option", loai.ten || loai.id, select).value = loai.id;
    select.value = daChon;
  }
}
async function taiDuLieu() {
  dangTai = true;
  khoaForm();
  thongBao(baoQuanLy, "Đang tải dữ liệu…");
  try {
    duLieu = await goiApi("/api/quan-ly");
    coDuLieu = true;
    hienChonLoai();
    hienThuoc();
    hienLoai();
    hienNcc();
    thongBao(baoQuanLy, "Đã tải dữ liệu. Bấm Tải lại dữ liệu sau khi có giao dịch bán hàng hoặc nhập kho.");
  } finally {
    dangTai = false;
    khoaForm();
  }
}
function datLaiForm(loai) {
  const form = document.getElementById("form" + loai);
  form.reset();
  form.dataset.hanhDong = "them";
  form.elements.id.readOnly = false;
  if (loai === "thuoc") { anhMoi.setCustomValidity(""); hienAnh(""); }
  document.getElementById("tieudeform" + loai).textContent = {
    thuoc: "Thêm thuốc mới", loai: "Thêm loại thuốc", ncc: "Thêm nhà cung cấp"
  }[loai];
  thongBao(document.getElementById("bao" + loai), "");
  document.getElementById("khung" + loai).open = false;
}
function suaDong(loai, ma) {
  if (dangLuu || dangTai) return;
  const danhSach = loai === "thuoc" ? duLieu.thuoc : loai === "loai" ? duLieu.loai : duLieu.nhaCungCap;
  const dong = danhSach.find(mon => mon.id === ma);
  if (!dong) return;
  datLaiForm(loai);
  const form = document.getElementById("form" + loai);
  form.dataset.hanhDong = "sua";
  form.elements.id.value = dong.id;
  form.elements.id.readOnly = true;
  form.elements.ten.value = dong.ten || "";
  if (loai === "thuoc") {
    form.elements.gia.value = Math.round(dong.gia * 1000);
    form.elements.maLoai.value = dong.maLoai || "";
    hienAnh(duongDanAnh(dong));
  }
  if (loai === "ncc") {
    form.elements.diaChi.value = dong.diaChi || "";
    form.elements.dienThoai.value = dong.dienThoai || "";
  }
  document.getElementById("tieudeform" + loai).textContent = "Chỉnh sửa " + dong.id;
  document.getElementById("khung" + loai).open = true;
  form.elements.ten.focus();
}
async function luuForm(suKien, loai, url) {
  suKien.preventDefault();
  if (dangLuu || dangTai) return;
  const form = suKien.currentTarget;
  const bao = document.getElementById("bao" + loai);
  const dong = {
    hanhDong: form.dataset.hanhDong || "them",
    id: form.elements.id.value.trim().toUpperCase(),
    ten: form.elements.ten.value.trim()
  };
  if (loai === "thuoc") {
    // Người dùng nhập đồng, SQL và API vẫn lưu nghìn đồng.
    dong.gia = Number(form.elements.gia.value) / 1000;
    dong.maLoai = form.elements.maLoai.value;
  }
  if (loai === "ncc") {
    dong.diaChi = form.elements.diaChi.value.trim();
    dong.dienThoai = form.elements.dienThoai.value.trim();
  }
  dangLuu = true;
  khoaForm();
  thongBao(bao, "Đang lưu…");
  let daLuu = false;
  try {
    if (loai === "thuoc" && anhMoi.files[0]) dong.anhMoi = await docFileAnh(anhMoi.files[0]);
    const ketQua = await goiApi(url, dong);
    daLuu = true;
    datLaiForm(loai);
    await taiDuLieu();
    thongBao(baoQuanLy, ketQua.thongBao);
    document.getElementById("tieudeform" + loai).focus();
  } catch (loi) {
    thongBao(daLuu ? baoQuanLy : bao, daLuu
      ? "Đã lưu thành công nhưng chưa tải lại được danh sách. Bấm Tải lại dữ liệu để kiểm tra."
      : loi.message, true);
  } finally {
    dangLuu = false;
    khoaForm();
  }
}

function hienAnh(duongDan) {
  if (anhTam) { URL.revokeObjectURL(anhTam); anhTam = ""; }
  xemAnh.hidden = !duongDan;
  if (duongDan) xemAnh.src = duongDan;
  else xemAnh.removeAttribute("src");
  moTaAnh.textContent = duongDan ? "Ảnh hiện tại" : "Chưa có ảnh.";
}
function docFileAnh(file) {
  return new Promise(function (resolve, reject) {
    const doc = new FileReader();
    doc.onload = () => resolve(doc.result.split(",")[1]);
    doc.onerror = () => reject(new Error("Không đọc được ảnh. Hãy chọn lại ảnh."));
    doc.readAsDataURL(file);
  });
}
anhMoi.addEventListener("change", function () {
  anhMoi.setCustomValidity("");
  const file = anhMoi.files[0];
  if (!file) {
    const mon = duLieu.thuoc.find(t => t.id === formThuoc.elements.id.value);
    hienAnh(mon ? duongDanAnh(mon) : ""); return;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
    const loi = "Chọn ảnh JPG, PNG hoặc WebP, tối đa 3 MB.";
    anhMoi.setCustomValidity(loi);
    thongBao(document.getElementById("baothuoc"), loi, true); return;
  }
  hienAnh("");
  anhTam = URL.createObjectURL(file);
  xemAnh.src = anhTam; xemAnh.hidden = false;
  moTaAnh.textContent = "Ảnh mới: " + file.name;
  thongBao(document.getElementById("baothuoc"), "Ảnh sẽ được tải lên khi bạn bấm Lưu thuốc.");
});
xemAnh.addEventListener("error", function () {
  xemAnh.hidden = true;
  moTaAnh.textContent = "Không đọc được ảnh.";
  if (anhMoi.files.length) anhMoi.setCustomValidity("Ảnh không đọc được. Hãy chọn ảnh khác.");
});

formThuoc.addEventListener("submit", e => luuForm(e, "thuoc", "/api/quan-ly/thuoc"));
formLoai.addEventListener("submit", e => luuForm(e, "loai", "/api/quan-ly/loai"));
formNcc.addEventListener("submit", e => luuForm(e, "ncc", "/api/quan-ly/nha-cung-cap"));
document.querySelector(".quanly").addEventListener("click", function (suKien) {
  const nutThem = suKien.target.closest("[data-them]");
  if (nutThem && !dangLuu && !dangTai) {
    const loai = nutThem.dataset.them;
    datLaiForm(loai);
    document.getElementById("khung" + loai).open = true;
    document.getElementById("form" + loai).elements.id.focus();
  }
  const nutSua = suKien.target.closest("[data-sua]");
  if (nutSua) suaDong(nutSua.dataset.sua, nutSua.dataset.ma);
  const nutHuy = suKien.target.closest("[data-huy]");
  if (nutHuy) {
    datLaiForm(nutHuy.dataset.huy);
    document.getElementById("tieudeform" + nutHuy.dataset.huy).focus();
  }
});
document.querySelectorAll(".mucquanly a").forEach(function (a) {
  a.addEventListener("click", function (suKien) {
    suKien.preventDefault();
    history.replaceState(null, "", a.hash);
    hienMuc();
  });
});
timThuoc.addEventListener("input", hienThuoc);
locLoai.addEventListener("change", hienThuoc);
locTon.addEventListener("change", hienThuoc);
nguongTon.addEventListener("input", hienThuoc);
taiLai.addEventListener("click", function () { taiDuLieu().catch(loi => thongBao(baoQuanLy, loi.message, true)); });
window.addEventListener("hashchange", hienMuc);
hienMuc();
taiDuLieu().catch(loi => thongBao(baoQuanLy, loi.message, true));
