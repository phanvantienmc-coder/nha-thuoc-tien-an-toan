const moChat = document.getElementById("mochat");
const khungChat = document.getElementById("khungchat");
const oChat = document.getElementById("noidungchat");
const tinNhan = document.getElementById("tinnhan");
const nutGui = document.getElementById("nutguichat");
let lichSuChat = [];
let dangGuiChat = false;

function dongChat() {
  khungChat.hidden = true;
  moChat.setAttribute("aria-expanded", "false");
  moChat.focus();
}
moChat.addEventListener("click", function () {
  if (!khungChat.hidden) { dongChat(); return; }
  khungChat.hidden = false;
  moChat.setAttribute("aria-expanded", "true");
  oChat.focus();
});
document.getElementById("dongchat").addEventListener("click", dongChat);
khungChat.addEventListener("keydown", function (suKien) {
  if (suKien.key === "Escape") dongChat();
});
function themTin(noidung, loai) {
  const tin = document.createElement("p");
  tin.className = loai;
  // Dùng textContent để câu trả lời AI không trở thành mã HTML.
  tin.textContent = noidung;
  tinNhan.appendChild(tin);
  tinNhan.scrollTop = tinNhan.scrollHeight;
  return tin;
}
document.querySelectorAll("[data-cauhoi]").forEach(function (nut) {
  nut.addEventListener("click", function () {
    if (dangGuiChat) return;
    oChat.value = nut.dataset.cauhoi;
    document.getElementById("guichat").requestSubmit();
  });
});
document.getElementById("guichat").addEventListener("submit", async function (suKien) {
  suKien.preventDefault();
  const cauHoi = oChat.value.trim();
  if (!cauHoi || dangGuiChat || cauHoi.length > 1000) return;
  dangGuiChat = true;
  nutGui.disabled = true;
  oChat.disabled = true;
  themTin(cauHoi, "tinkhach");
  oChat.value = "";
  const cho = themTin("Đang trả lời…", "tinai");
  // Giữ tối đa 4 lượt hỏi/đáp, chỉ trong bộ nhớ của trang đang mở.
  const tinGui = lichSuChat.slice(-8).concat({ role: "user", content: cauHoi });
  try {
    const phanHoi = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tinNhan: tinGui }), signal: AbortSignal.timeout(35000)
    });
    const ketQua = await phanHoi.json();
    cho.remove();
    if (!phanHoi.ok) {
      themTin(ketQua.loi || "Chưa nhận được câu trả lời. Vui lòng thử lại sau.", "tinai tinloi");
      oChat.value = cauHoi;
      return;
    }
    themTin(ketQua.traLoi, "tinai");
    lichSuChat = tinGui.concat({ role: "assistant", content: ketQua.traLoi.slice(0, 1000) });
  } catch {
    cho.remove();
    themTin("Chưa kết nối được trợ lý AI. Bạn thử lại sau nhé.", "tinai tinloi");
    oChat.value = cauHoi;
  } finally {
    dangGuiChat = false;
    nutGui.disabled = false;
    oChat.disabled = false;
    if (!khungChat.hidden) oChat.focus();
  }
});
