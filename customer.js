/* ---------- Password halaman customer ---------- */
(function () {
  "use strict";

  var PW_KEY = "ajaclean_pw";
  var SESSION = "ajaclean_auth";
  var $ = function (id) { return document.getElementById(id); };

  function cyrb53(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  function hash(text) {
    var salted = "ajaclean:" + text;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(salted)).then(function (buf) {
        return "s:" + Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
    }
    return Promise.resolve("c:" + cyrb53(salted));
  }

  function unlock() {
    sessionStorage.setItem(SESSION, "1");
    $("login").hidden = true;
    $("app").hidden = false;
    $("logoutBtn").hidden = false;
  }

  var stored = localStorage.getItem(PW_KEY);

  if (sessionStorage.getItem(SESSION) === "1" && stored) {
    unlock();
  } else {
    $("login").hidden = false;
    if (!stored) {
      $("loginTitle").textContent = "Buat password";
      $("loginHint").textContent = "Pertama kali membuka halaman ini. Buat password minimal 6 karakter.";
      $("pw2wrap").hidden = false;
      $("pw2").required = true;
      $("loginBtn").textContent = "Simpan password";
      $("pw").autocomplete = "new-password";
    } else {
      $("loginHint").textContent = "Masukkan password untuk membuka data customer.";
    }
    $("pw").focus();
  }

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("pw").value;
    $("loginErr").textContent = "";

    if (!stored) {
      if (pw !== $("pw2").value) { $("loginErr").textContent = "Password tidak sama."; return; }
      hash(pw).then(function (h) {
        localStorage.setItem(PW_KEY, h);
        stored = h;
        unlock();
      });
    } else {
      hash(pw).then(function (h) {
        if (h === stored) { unlock(); }
        else { $("loginErr").textContent = "Password salah."; $("pw").select(); }
      });
    }
  });

  $("logoutBtn").addEventListener("click", function () {
    sessionStorage.removeItem(SESSION);
    location.reload();
  });
})();

(function () {
  "use strict";

  var KEY = "ajaclean_customers";

  var $ = function (id) { return document.getElementById(id); };
  var form = $("customerForm");
  var layanan = $("layanan");
  var harga = $("harga");

  var data = load();

  /* ---------- Penyimpanan (localStorage di browser ini) ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { alert("Data tidak bisa disimpan di browser ini."); }
  }

  /* ---------- Helper ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rupiah(n) {
    return "Rp " + Number(n || 0).toLocaleString("id-ID");
  }
  function waNumber(telp) {
    var n = String(telp).replace(/\D/g, "");
    if (n.indexOf("0") === 0) n = "62" + n.slice(1);
    return n;
  }
  function setHargaDariLayanan() {
    var opt = layanan.options[layanan.selectedIndex];
    harga.value = opt.getAttribute("data-harga");
  }

  /* ---------- Render ---------- */
  function render() {
    var q = $("search").value.trim().toLowerCase();
    var fs = $("filterStatus").value;

    var rows = data.filter(function (c) {
      var cocok = !q || (c.nama + " " + c.sepatu + " " + c.telp).toLowerCase().indexOf(q) !== -1;
      return cocok && (!fs || c.status === fs);
    });

    $("tbody").innerHTML = rows.map(function (c) {
      var opts = ["Diterima", "Dicuci", "Selesai", "Diambil"].map(function (s) {
        return '<option' + (s === c.status ? " selected" : "") + ">" + s + "</option>";
      }).join("");

      var pesan = "Halo " + c.nama + ", sepatu " + c.sepatu + " kamu sudah selesai dibersihkan di AjaClean. Silakan diambil ya!";
      var wa = "https://wa.me/" + waNumber(c.telp) + "?text=" + encodeURIComponent(pesan);

      return "<tr>" +
        "<td>" + esc(c.nama) + "<small>" + esc(c.telp) + "</small></td>" +
        "<td>" + esc(c.sepatu) + (c.catatan ? "<small>" + esc(c.catatan) + "</small>" : "") + "</td>" +
        "<td>" + esc(c.layanan) + "</td>" +
        "<td>" + rupiah(c.harga) + "</td>" +
        '<td><select class="badge-' + esc(c.status) + '" data-status="' + c.id + '" aria-label="Status">' + opts + "</select></td>" +
        '<td><div class="row-actions">' +
          '<a href="' + wa + '" target="_blank" rel="noopener">WA</a>' +
          '<button type="button" data-edit="' + c.id + '">Edit</button>' +
          '<button type="button" class="danger" data-del="' + c.id + '">Hapus</button>' +
        "</div></td>" +
      "</tr>";
    }).join("");

    $("empty").hidden = rows.length > 0;
    if (data.length && !rows.length) {
      $("empty").textContent = "Tidak ada order yang cocok dengan pencarian.";
      $("empty").hidden = false;
    } else {
      $("empty").textContent = "Belum ada order. Isi formulir di atas untuk menambahkan.";
    }

    var selesai = data.filter(function (c) { return c.status === "Selesai"; }).length;
    var proses = data.filter(function (c) { return c.status === "Diterima" || c.status === "Dicuci"; }).length;
    var omzet = data.reduce(function (t, c) { return t + Number(c.harga || 0); }, 0);

    $("statTotal").textContent = data.length;
    $("statProses").textContent = proses;
    $("statSelesai").textContent = selesai;
    $("statOmzet").textContent = rupiah(omzet);
  }

  /* ---------- Form ---------- */
  function resetForm() {
    form.reset();
    $("editId").value = "";
    $("formTitle").textContent = "Tambah order";
    $("saveBtn").textContent = "Simpan";
    $("cancelBtn").hidden = true;
    layanan.selectedIndex = 1;
    setHargaDariLayanan();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var item = {
      id: $("editId").value || String(Date.now()),
      nama: $("nama").value.trim(),
      telp: $("telp").value.trim(),
      sepatu: $("sepatu").value.trim(),
      layanan: layanan.value,
      harga: Number(harga.value),
      status: $("status").value,
      catatan: $("catatan").value.trim()
    };

    var i = data.findIndex(function (c) { return c.id === item.id; });
    if (i === -1) data.unshift(item); else data[i] = item;

    save();
    resetForm();
    render();
  });

  layanan.addEventListener("change", setHargaDariLayanan);
  $("cancelBtn").addEventListener("click", resetForm);
  $("search").addEventListener("input", render);
  $("filterStatus").addEventListener("change", render);

  /* ---------- Aksi di tabel ---------- */
  $("tbody").addEventListener("click", function (e) {
    var edit = e.target.getAttribute("data-edit");
    var del = e.target.getAttribute("data-del");

    if (edit) {
      var c = data.filter(function (x) { return x.id === edit; })[0];
      if (!c) return;
      $("editId").value = c.id;
      $("nama").value = c.nama;
      $("telp").value = c.telp;
      $("sepatu").value = c.sepatu;
      layanan.value = c.layanan;
      harga.value = c.harga;
      $("status").value = c.status;
      $("catatan").value = c.catatan || "";
      $("formTitle").textContent = "Edit order";
      $("saveBtn").textContent = "Simpan perubahan";
      $("cancelBtn").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (del && confirm("Hapus order ini?")) {
      data = data.filter(function (x) { return x.id !== del; });
      save();
      render();
    }
  });

  $("tbody").addEventListener("change", function (e) {
    var id = e.target.getAttribute("data-status");
    if (!id) return;
    data.forEach(function (c) { if (c.id === id) c.status = e.target.value; });
    save();
    render();
  });

  /* ---------- Mulai ---------- */
  setHargaDariLayanan();
  render();
})();