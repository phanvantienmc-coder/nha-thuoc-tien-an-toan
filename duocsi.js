let duocSi = [];
let thuoc = [];
let dangTai = false;
let dangLuu = false;
let coDuLieu = false;
const formDs = document.getElementById("formduocsi");
const bangDs = document.getElementById("bangduocsi");
const baoDs = document.getElementById("baoduocsi");
const baoForm = document.getElementById("baoformds");
const timDs = document.getElementById("timduocsi");
const themDs = document.getElementById("themduocsi");
const taiLaiDs = document.getElementById("tailaids");
const khungDs = document.getElementById("khungduocsi");
const tieuDeForm = document.getElementById("tieudeformds");

function taoThe(ten, chu, cha) {
  const the = document.createElement(ten);
  the.textContent = chu;
  cha.appendChild(the);
  return the;
}
function boDau(chu) {
  return String(chu || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
function thongBao(the, chu, loi = false) {
  the.textContent = chu;
  the.classList.toggle("loi", loi);
}
function khoaForm() {
  const khoa = !coDuLieu || dangTai || dangLuu;
  formDs.querySelector("fieldset").disabled = khoa;
  themDs.disabled = khoa;
  taiLaiDs.disabled = dangTai || dangLuu;
  bangDs.querySelectorAll("button").forEach(nut => { nut.disabled = khoa; });
}
function hienDuocSi() {
  bangDs.replaceChildren();
  const tuKhoa = boDau(timDs.value.trim());
  const ketQua = duocSi.filter(ds => boDau([ds.id, ds.ten, ds.maThuoc, ds.tenThuoc].join(" ")).includes(tuKhoa));
  document.getElementById("demduocsi").textContent = "Hiển thị " + ketQua.length + "/" + duocSi.length + " dược sĩ.";
  for (const ds of ketQua) {
    const dong = bangDs.insertRow();
    taoThe("td", ds.id, dong);
    taoThe("td", ds.ten || "Chưa có tên", dong);
    taoThe("td", ds.maThuoc ? (ds.tenThuoc || ds.maThuoc) + " · " + ds.maThuoc : "Chưa phân thuốc", dong);
    taoThe("td", ds.soDon, dong).className = "so";
    const thaoTac = dong.insertCell();
    const nut = taoThe("button", "Sửa", thaoTac);
    nut.type = "button";
    nut.className = "nutphu";
    nut.dataset.ma = ds.id;
    nut.setAttribute("aria-label", "Sửa dược sĩ " + (ds.ten || ds.id));
    const xoa = taoThe('button', 'Xóa', thaoTac);
    xoa.type = 'button'; xoa.className = 'nutphu';
    xoa.dataset.xoa = ds.id;
    xoa.setAttribute('aria-label', 'Xóa dược sĩ ' + (ds.ten || ds.id));
    xoa.title = ds.soDon ? 'Dược sĩ đã có phân công trong hóa đơn nên không thể xóa.' : 'Xóa dược sĩ chưa có phân công';
  }
  if (!ketQua.length) {
    const o = bangDs.insertRow().insertCell(); o.colSpan = 5;
    o.textContent = "Chưa có dược sĩ phù hợp. Thử từ khóa khác hoặc thêm dược sĩ mới.";
  }
  khoaForm();
}
async function goiApi(duLieu) {
  const phanHoi = await fetch("/api/duoc-si", duLieu ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(duLieu)
  } : {});
  if (phanHoi.status === 401) {
    location.replace("/dangnhap.html");
    throw new Error("Phiên đăng nhập đã hết hạn.");
  }
  const ketQua = await phanHoi.json();
  if (!phanHoi.ok) throw new Error(ketQua.loi || "Không tải hoặc lưu được dữ liệu. Hãy thử lại.");
  return ketQua;
}
async function taiDuLieu() {
  dangTai = true;
  khoaForm();
  thongBao(baoDs, "Đang tải dược sĩ…");
  try {
    const ketQua = await goiApi();
    duocSi = ketQua.duocSi;
    thuoc = ketQua.thuoc;
    coDuLieu = true;
    const daChon = formDs.elements.maThuoc.value;
    formDs.elements.maThuoc.replaceChildren();
    taoThe("option", "Chưa phân thuốc", formDs.elements.maThuoc).value = "";
    for (const mon of thuoc) taoThe("option", mon.id + " · " + (mon.ten || "Chưa có tên"), formDs.elements.maThuoc).value = mon.id;
    formDs.elements.maThuoc.value = daChon;
    hienDuocSi();
    thongBao(baoDs, "Đã tải dữ liệu dược sĩ và số hóa đơn được phân công.");
  } finally { dangTai = false; khoaForm(); }
}
function datLaiForm() {
  formDs.reset();
  formDs.dataset.hanhDong = "them";
  formDs.elements.id.readOnly = false;
  tieuDeForm.textContent = "Thêm dược sĩ mới";
  thongBao(baoForm, "");
  khungDs.open = false;
}
themDs.addEventListener("click", function () {
  datLaiForm(); khungDs.open = true; formDs.elements.id.focus();
});
document.getElementById("huyduocsi").addEventListener("click", function () { datLaiForm(); tieuDeForm.focus(); });
bangDs.addEventListener("click", async function (suKien) {
  const xoa = suKien.target.closest('button[data-xoa]');
  if (xoa) {
    if (dangTai || dangLuu) return;
    const ds = duocSi.find(d => d.id === xoa.dataset.xoa);
    if (!ds) return;
    if (ds.soDon) { thongBao(baoDs, 'Dược sĩ đã có phân công trong hóa đơn, không thể xóa để giữ lịch sử.', true); return; }
    if (!window.confirm('Xóa dược sĩ ' + ds.id + ' · ' + (ds.ten || '') + '? Không thể hoàn tác.')) return;
    dangLuu = true; khoaForm();
    thongBao(baoDs, 'Đang xóa dược sĩ…');
    let daXoa = false;
    try {
      const ketQua = await goiApi({hanhDong:'xoa', id:ds.id}); daXoa = true;
      if (formDs.dataset.hanhDong === 'sua' && formDs.elements.id.value === ds.id) datLaiForm();
      await taiDuLieu();
      thongBao(baoDs, ketQua.thongBao);
    } catch (loi) { thongBao(baoDs, daXoa ? 'Đã xóa nhưng chưa tải lại được danh sách. Bấm Tải lại dữ liệu để kiểm tra.' : loi.message, true); }
    finally { dangLuu = false; khoaForm(); }
    return;
  }
  const nut = suKien.target.closest("button[data-ma]");
  if (!nut || dangTai || dangLuu) return;
  const ds = duocSi.find(d => d.id === nut.dataset.ma);
  if (!ds) return;
  datLaiForm();
  formDs.dataset.hanhDong = "sua";
  formDs.elements.id.value = ds.id;
  formDs.elements.id.readOnly = true;
  formDs.elements.ten.value = ds.ten || "";
  formDs.elements.maThuoc.value = ds.maThuoc || "";
  tieuDeForm.textContent = "Chỉnh sửa " + ds.id;
  khungDs.open = true;
  formDs.elements.ten.focus();
});
formDs.addEventListener("submit", async function (suKien) {
  suKien.preventDefault();
  if (dangLuu || dangTai) return;
  const duLieu = { hanhDong: formDs.dataset.hanhDong || "them", id: formDs.elements.id.value.trim().toUpperCase(),
    ten: formDs.elements.ten.value.trim(), maThuoc: formDs.elements.maThuoc.value };
  dangLuu = true; khoaForm();
  thongBao(baoForm, "Đang lưu…");
  let daLuu = false;
  try {
    await goiApi(duLieu); daLuu = true;
    datLaiForm();
    await taiDuLieu();
    thongBao(baoDs, "Đã lưu thông tin dược sĩ.");
    tieuDeForm.focus();
  } catch (loi) {
    thongBao(daLuu ? baoDs : baoForm, daLuu ? "Đã lưu dược sĩ nhưng chưa tải lại được danh sách. Bấm Tải lại dữ liệu để kiểm tra." : loi.message, true);
  } finally { dangLuu = false; khoaForm(); }
});
timDs.addEventListener("input", hienDuocSi);
taiLaiDs.addEventListener("click", () => taiDuLieu().catch(loi => thongBao(baoDs, loi.message, true)));
taiDuLieu().catch(loi => thongBao(baoDs, loi.message, true));
