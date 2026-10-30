import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  Search,
  Plus,
  X,
  Eye,
  CheckCircle2,
  Truck,
  Package,
  Calendar,
  Phone,
  MapPin,
  User,
  ChevronDown,
  Edit3,
  Trash2,
  Send,
  Maximize2,
  Minimize2,
  CreditCard,
  DollarSign,
  Store,
  Clock,
  Tag,
  FileText,
  Users,
  Save,
  Layers,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  ClipboardList,
} from "lucide-react";
import SearchableSelect from "../../components/SearchableSelect";
import RupiahInput from "../../components/RupiahInput";
import {
  toastSuccess,
  toastError,
  showWarning,
  showConfirm,
} from "../../utils/alert.util";
import { getActiveCompany } from "../../utils/tenant.util";

function formatRupiah(val) {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
}

const STATUS_LIST = [
  { value: "draft", label: "Draft", color: "#94a3b8", bg: "#f1f5f9" },
  {
    value: "dikonfirmasi",
    label: "Dikonfirmasi",
    color: "#f59e0b",
    bg: "#fef3c7",
  },
  { value: "diproses", label: "Diproses", color: "#3b82f6", bg: "#dbeafe" },
  { value: "siap_kirim", label: "Siap Kirim", color: "#8b5cf6", bg: "#ede9fe" },
  { value: "dikirim", label: "Dikirim", color: "#06b6d4", bg: "#cffafe" },
  { value: "selesai", label: "Selesai", color: "#10b981", bg: "#d1fae5" },
  { value: "dibatalkan", label: "Dibatalkan", color: "#ef4444", bg: "#fee2e2" },
];

const BAYAR_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
];

const BANK_OPTIONS = [
  { value: "BCA", label: "BCA" },
  { value: "Mandiri", label: "Bank Mandiri" },
  { value: "BRI", label: "BRI" },
  { value: "BNI", label: "BNI" },
  { value: "BSI", label: "BSI (Bank Syariah Indonesia)" },
  { value: "CIMB", label: "CIMB Niaga" },
  { value: "Permata", label: "Bank Permata" },
  { value: "Danamon", label: "Bank Danamon" },
  { value: "Jago", label: "Bank Jago" },
  { value: "SeaBank", label: "SeaBank" },
  { value: "Lainnya", label: "Bank Lainnya" },
];

const SIZE_WEIGHTS = {
  // Numeric sizes (0 - 30)
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
  "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "11": 11, "12": 12, "13": 13, "14": 14, "15": 15,
  "16": 16, "17": 17, "18": 18, "19": 19, "20": 20,
  // Standard letter sizes
  "4XS": 90, "XXXXS": 90,
  "3XS": 95, "XXXS": 95,
  "2XS": 100, "XXS": 100,
  "XS": 105,
  "S": 110,
  "M": 115,
  "L": 120,
  "XL": 125,
  "2XL": 130, "XXL": 130,
  "3XL": 135, "XXXL": 135,
  "4XL": 140, "XXXXL": 140,
  "5XL": 145, "XXXXXL": 145,
  "6XL": 150,
  "7XL": 155,
  "8XL": 160,
  "ALL SIZE": 200, "ALLSIZE": 200, "JUMBO": 210,
};

function parseItemForSort(item) {
  const sku = (item.kode_sku || item.sku || "").trim();
  const name = (item.nama_produk || item.nama || "").trim();

  // 1. Ekstrak dari akhiran SKU (contoh: BB-TH-BIRU-LPK-L -> L)
  const skuParts = sku.split(/[-_\s]+/);
  if (skuParts.length > 1) {
    const lastSku = skuParts[skuParts.length - 1].toUpperCase();
    if (SIZE_WEIGHTS[lastSku] !== undefined) {
      return {
        base: skuParts.slice(0, -1).join("-").toLowerCase(),
        weight: SIZE_WEIGHTS[lastSku],
        rawName: name.toLowerCase(),
        rawSku: sku.toLowerCase(),
      };
    }
  }

  // 2. Ekstrak dari akhiran Nama Produk
  const nameParts = name.split(/[-_\s]+/);
  if (nameParts.length > 1) {
    const lastName = nameParts[nameParts.length - 1].toUpperCase();
    if (SIZE_WEIGHTS[lastName] !== undefined) {
      return {
        base: nameParts.slice(0, -1).join(" ").toLowerCase(),
        weight: SIZE_WEIGHTS[lastName],
        rawName: name.toLowerCase(),
        rawSku: sku.toLowerCase(),
      };
    }
  }

  return {
    base: (name || sku).toLowerCase(),
    weight: 999,
    rawName: name.toLowerCase(),
    rawSku: sku.toLowerCase(),
  };
}

function compareProducts(a, b) {
  const pA = parseItemForSort(a);
  const pB = parseItemForSort(b);

  // Jika nama/sku dasar sama dan keduanya punya ukuran dikenali, urutkan berdasarkan size
  if (pA.base === pB.base && pA.weight !== 999 && pB.weight !== 999) {
    return pA.weight - pB.weight;
  }

  // Urutkan secara alfabetik natural
  const baseCompare = pA.base.localeCompare(pB.base, "id", {
    numeric: true,
    sensitivity: "base",
  });
  if (baseCompare !== 0) return baseCompare;

  return pA.rawSku.localeCompare(pB.rawSku, "id", {
    numeric: true,
    sensitivity: "base",
  });
}

function isSingleProduct(p) {
  const sku = (p.kode_sku || p.sku || "").toUpperCase();
  const tipe = (p.tipe_set || "").toLowerCase();
  const nama = (p.nama_produk || p.nama || "").toLowerCase();

  // Jika eksplisit tipe_set === 'single'
  if (tipe === "single") return true;

  // Jika diawali SET- atau ada kata bundle/setel
  if (
    sku.startsWith("SET-") ||
    sku.startsWith("SET_") ||
    tipe.includes("set") ||
    tipe.includes("bundle") ||
    nama.startsWith("satu setel") ||
    nama.includes("setelan")
  ) {
    return false;
  }

  return true;
}

export default function PenjualanOfflineView({ onNavigate }) {
  const [activeCompany] = useState(getActiveCompany);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterToko, setFilterToko] = useState("Semua");
  const [filterPembayaran, setFilterPembayaran] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  // Modals & Edit Mode
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingNoPesanan, setEditingNoPesanan] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [detailOrder, setDetailOrder] = useState(null);
  const [editStatusId, setEditStatusId] = useState(null);
  const [editResiId, setEditResiId] = useState(null);
  const [resiInput, setResiInput] = useState("");

  // Modal Pembayaran / Cicilan
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    tanggal_bayar: new Date().toISOString().slice(0, 10),
    nominal: 0,
    metode_pembayaran: "cash",
    bank_tujuan: "",
    keterangan: "",
  });

  // Modal Input ke SPK Produksi
  const [spkModalOrder, setSpkModalOrder] = useState(null);
  const [isSavingSpk, setIsSavingSpk] = useState(false);
  const [spkForm, setSpkForm] = useState({
    kode_produksi: "",
    id_spk: "",
    nama_spk: "",
    penjahit: "Penjahit Workshop",
    status_spk: "Potong Pola",
    tgl_pesan: new Date().toISOString().slice(0, 10),
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    catatan: "",
    items: [],
  });

  // Stores & Pelanggan
  const [stores, setStores] = useState([]);
  const [pelangganList, setPelangganList] = useState([]);
  const [selectedPelangganId, setSelectedPelangganId] = useState("");

  // Modal Pelanggan (Tambah & Edit)
  const [isPelangganModalOpen, setIsPelangganModalOpen] = useState(false);
  const [isSavingPelanggan, setIsSavingPelanggan] = useState(false);
  const [pelangganModalMode, setPelangganModalMode] = useState("create"); // 'create' | 'edit'
  const [pelangganForm, setPelangganForm] = useState({
    id: null,
    kode_pelanggan: "",
    nama_pelanggan: "",
    no_hp: "",
    alamat: "",
    kategori_pelanggan: "Umum",
    status: "Aktif",
  });

  // Master Bank (Tambah & Edit)
  const [bankList, setBankList] = useState([]);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankModalMode, setBankModalMode] = useState("create"); // 'create' | 'edit'
  const [bankForm, setBankForm] = useState({
    id: null,
    nama_bank: "",
    no_rekening: "",
    atas_nama: "",
    status: "Aktif",
  });

  // Master produk for autocomplete
  const [masterProduk, setMasterProduk] = useState([]);
  const [produkSearch, setProdukSearch] = useState("");
  const [showProdukDropdown, setShowProdukDropdown] = useState(false);
  const [filterSingleOnly, setFilterSingleOnly] = useState(true);

  // Form state
  const [form, setForm] = useState({
    id_toko: "",
    nama_toko: "",
    nama_pembeli: "",
    no_telepon: "",
    alamat_pengiriman: "",
    kota: "",
    provinsi: "",
    kode_pos: "",
    is_dropship: false,
    nama_pengirim_ds: "",
    no_telp_pengirim_ds: "",
    kurir: "",
    jenis_layanan: "",
    batas_kirim: new Date().toISOString().slice(0, 10),
    jenis_transaksi: "tunai",
    diskon: 0,
    ongkir: 0,
    metode_pembayaran: "cash",
    bank_tujuan: "",
    status_pembayaran: "belum_bayar",
    nominal_dp: 0,
    status_pesanan: "draft",
    catatan: "",
    items: [],
  });

  // ── Load data ───────────────────────────────────────────────────────────
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        kode_perusahaan: activeCompany.code,
      });
      const res = await fetch(`/api/offline/orders?${params}`);
      const json = await res.json();
      setOrders(json.data || []);
    } catch (e) {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const res = await fetch("/api/marketplace/stores");
      const json = await res.json();
      setStores(json.data || []);
    } catch (e) {
      setStores([]);
    }
  };

  const loadMasterProduk = async () => {
    try {
      const res = await fetch(
        `/api/marketplace/master?limit=5000&sort=nama_produk&kode_perusahaan=${activeCompany?.code || "RSG"}`,
      );
      const json = await res.json();
      const list = Array.isArray(json.data)
        ? [...json.data].sort(compareProducts)
        : [];
      setMasterProduk(list);
    } catch (e) {
      setMasterProduk([]);
    }
  };

  const loadPelanggan = async () => {
    try {
      const res = await fetch(
        `/api/pelanggan?kode_perusahaan=${activeCompany?.code || "RSG"}`,
      );
      const json = await res.json();
      setPelangganList(json.data || []);
    } catch (e) {
      setPelangganList([]);
    }
  };

  const handleOpenAddPelanggan = () => {
    setPelangganModalMode("create");
    setPelangganForm({
      id: null,
      kode_pelanggan: `PLG-${new Date().getFullYear()}-${String(pelangganList.length + 1).padStart(3, "0")}`,
      nama_pelanggan: "",
      no_hp: "",
      alamat: "",
      kategori_pelanggan: "Umum",
      status: "Aktif",
    });
    setIsPelangganModalOpen(true);
  };

  const handleOpenEditPelanggan = () => {
    const cust =
      pelangganList.find((p) => String(p.id) === String(selectedPelangganId)) ||
      pelangganList.find(
        (p) => (p.nama_pelanggan || p.nama) === form.nama_pembeli,
      );

    if (cust) {
      setPelangganModalMode("edit");
      setPelangganForm({
        id: cust.id,
        kode_pelanggan: cust.kode_pelanggan || "",
        nama_pelanggan: cust.nama_pelanggan || cust.nama || "",
        no_hp: cust.no_hp || cust.telepon || "",
        alamat: cust.alamat || "",
        kategori_pelanggan: cust.kategori_pelanggan || "Umum",
        status: cust.status || "Aktif",
      });
      setIsPelangganModalOpen(true);
    } else if (form.nama_pembeli) {
      setPelangganModalMode("create");
      setPelangganForm({
        id: null,
        kode_pelanggan: `PLG-${new Date().getFullYear()}-${String(pelangganList.length + 1).padStart(3, "0")}`,
        nama_pelanggan: form.nama_pembeli,
        no_hp: form.no_telepon || "",
        alamat: form.alamat_pengiriman || "",
        kategori_pelanggan: "Umum",
        status: "Aktif",
      });
      setIsPelangganModalOpen(true);
    } else {
      toastError("Pilih pelanggan terlebih dahulu untuk mengedit data!");
    }
  };

  const handleSavePelanggan = async (e) => {
    if (e) e.preventDefault();
    if (!pelangganForm.nama_pelanggan?.trim()) {
      toastError("Nama Pelanggan wajib diisi!");
      return;
    }

    setIsSavingPelanggan(true);
    try {
      const payload = {
        ...pelangganForm,
        nama_pelanggan: pelangganForm.nama_pelanggan.trim(),
        no_hp: pelangganForm.no_hp?.trim() || "",
        alamat: pelangganForm.alamat?.trim() || "",
        kode_perusahaan: activeCompany?.code || "RSG",
      };

      const res = await fetch("/api/pelanggan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.ok) {
        toastSuccess(
          pelangganModalMode === "edit"
            ? "Data pelanggan berhasil diperbarui!"
            : "Pelanggan baru berhasil ditambahkan!",
        );

        // Reload list pelanggan
        const refetchRes = await fetch(
          `/api/pelanggan?kode_perusahaan=${activeCompany?.code || "RSG"}`,
        );
        if (refetchRes.ok) {
          const refetchJson = await refetchRes.json();
          setPelangganList(refetchJson.data || []);
        }

        const newOrUpdatedId = String(json.id || pelangganForm.id || "");
        if (newOrUpdatedId) {
          setSelectedPelangganId(newOrUpdatedId);
        }

        // Otomatis sinkron ke form pesanan
        setForm((prev) => ({
          ...prev,
          nama_pembeli: pelangganForm.nama_pelanggan.trim(),
          no_telepon: pelangganForm.no_hp?.trim() || "",
          alamat_pengiriman: pelangganForm.alamat?.trim() || "",
        }));

        setIsPelangganModalOpen(false);
      } else {
        throw new Error(json.message || "Gagal menyimpan data pelanggan");
      }
    } catch (err) {
      toastError(`Gagal simpan pelanggan: ${err.message}`);
    } finally {
      setIsSavingPelanggan(false);
    }
  };

  const loadBank = async () => {
    try {
      const res = await fetch(`/api/bank?kode_perusahaan=${activeCompany?.code || "RSG"}`);
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        setBankList(json.data);
      } else {
        setBankList(BANK_OPTIONS.map((b, i) => ({ id: i + 1, nama_bank: b.label, no_rekening: "", atas_nama: "" })));
      }
    } catch (e) {
      setBankList(BANK_OPTIONS.map((b, i) => ({ id: i + 1, nama_bank: b.label, no_rekening: "", atas_nama: "" })));
    }
  };

  const handleOpenAddBank = () => {
    setBankModalMode("create");
    setBankForm({
      id: null,
      nama_bank: "",
      no_rekening: "",
      atas_nama: activeCompany?.name || "",
      status: "Aktif",
    });
    setIsBankModalOpen(true);
  };

  const handleOpenEditBank = () => {
    const b = bankList.find(
      (item) => item.nama_bank.toLowerCase() === (form.bank_tujuan || "").toLowerCase(),
    );
    if (b) {
      setBankModalMode("edit");
      setBankForm({
        id: b.id,
        nama_bank: b.nama_bank,
        no_rekening: b.no_rekening || "",
        atas_nama: b.atas_nama || "",
        status: b.status || "Aktif",
      });
      setIsBankModalOpen(true);
    } else if (form.bank_tujuan) {
      setBankModalMode("create");
      setBankForm({
        id: null,
        nama_bank: form.bank_tujuan,
        no_rekening: "",
        atas_nama: "",
        status: "Aktif",
      });
      setIsBankModalOpen(true);
    } else {
      toastError("Pilih bank tujuan terlebih dahulu untuk mengedit data!");
    }
  };

  const handleSaveBank = async (e) => {
    if (e) e.preventDefault();
    if (!bankForm.nama_bank?.trim()) {
      toastError("Nama bank wajib diisi!");
      return;
    }

    setIsSavingBank(true);
    try {
      const payload = {
        ...bankForm,
        nama_bank: bankForm.nama_bank.trim(),
        no_rekening: bankForm.no_rekening?.trim() || "",
        atas_nama: bankForm.atas_nama?.trim() || "",
        kode_perusahaan: activeCompany?.code || "RSG",
      };

      const res = await fetch("/api/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.ok) {
        toastSuccess(
          bankModalMode === "edit"
            ? "Data bank berhasil diperbarui!"
            : "Bank baru berhasil ditambahkan!",
        );
        await loadBank();
        setForm((prev) => ({
          ...prev,
          bank_tujuan: bankForm.nama_bank.trim(),
        }));
        setIsBankModalOpen(false);
      } else {
        throw new Error(json.message || "Gagal menyimpan data bank");
      }
    } catch (err) {
      // Fallback lokal jika offline
      setBankList((prev) => {
        if (bankModalMode === "edit" && bankForm.id) {
          return prev.map((item) =>
            item.id === bankForm.id ? { ...bankForm } : item,
          );
        } else {
          return [...prev, { ...bankForm, id: Date.now() }];
        }
      });
      setForm((prev) => ({
        ...prev,
        bank_tujuan: bankForm.nama_bank.trim(),
      }));
      toastSuccess("Data bank disimpan (lokal)");
      setIsBankModalOpen(false);
    } finally {
      setIsSavingBank(false);
    }
  };

  useEffect(() => {
    loadOrders();
    loadStores();
    loadMasterProduk();
    loadPelanggan();
    loadBank();
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({
      id_toko: "",
      nama_toko: "",
      nama_pembeli: "",
      no_telepon: "",
      alamat_pengiriman: "",
      kota: "",
      provinsi: "",
      kode_pos: "",
      is_dropship: false,
      nama_pengirim_ds: "",
      no_telp_pengirim_ds: "",
      kurir: "",
      jenis_layanan: "",
      batas_kirim: new Date().toISOString().slice(0, 10),
      jenis_transaksi: "tunai",
      diskon: 0,
      ongkir: 0,
      metode_pembayaran: "cash",
      bank_tujuan: "",
      status_pembayaran: "belum_bayar",
      nominal_dp: 0,
      status_pesanan: "draft",
      catatan: "",
      items: [],
    });
    setEditingOrderId(null);
    setEditingNoPesanan("");
    setSelectedPelangganId("");
    setProdukSearch("");
  };

  const handleEditOrder = async (id) => {
    try {
      const res = await fetch(`/api/offline/orders/${id}`);
      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json.message || "Gagal memuat data pesanan");
      }
      const ord = json.data;
      const matchedCust = pelangganList.find(
        (p) => (p.nama_pelanggan || p.nama) === ord.nama_pembeli,
      );
      setSelectedPelangganId(matchedCust ? String(matchedCust.id) : "");
      setEditingOrderId(ord.id);
      setEditingNoPesanan(ord.no_pesanan || "");
      setForm({
        id_toko: ord.id_toko ? String(ord.id_toko) : "",
        nama_toko: ord.nama_toko || "",
        nama_pembeli: ord.nama_pembeli || "",
        no_telepon: ord.no_telepon || "",
        alamat_pengiriman: ord.alamat_pengiriman || "",
        kota: ord.kota || "",
        provinsi: ord.provinsi || "",
        kode_pos: ord.kode_pos || "",
        is_dropship: Boolean(ord.is_dropship),
        nama_pengirim_ds: ord.nama_pengirim_ds || "",
        no_telp_pengirim_ds: ord.no_telp_pengirim_ds || "",
        kurir: ord.kurir || "",
        jenis_layanan: ord.jenis_layanan || "",
        batas_kirim: ord.batas_kirim
          ? new Date(ord.batas_kirim).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        jenis_transaksi: ord.jenis_transaksi || "tunai",
        diskon: Number(ord.diskon) || 0,
        ongkir: 0,
        metode_pembayaran: ord.metode_pembayaran || "cash",
        bank_tujuan: ord.bank_tujuan || "",
        status_pembayaran: ord.status_pembayaran || "belum_bayar",
        nominal_dp: Number(ord.nominal_dp) || 0,
        status_pesanan: ord.status_pesanan || "draft",
        catatan: ord.catatan || "",
        items: (ord.items || []).map((it) => ({
          sku: it.sku || "",
          nama_produk: it.nama_produk || "",
          varian: it.varian || "",
          qty: Number(it.qty) || 1,
          harga_satuan: Number(it.harga_satuan) || 0,
          diskon_item: Number(it.diskon_item) || 0,
          catatan_item: it.catatan_item || "",
        })),
      });
      setProdukSearch("");
      setShowForm(true);
    } catch (err) {
      toastError(err.message || "Gagal memuat pesanan untuk diedit");
    }
  };

  const addItem = (produk) => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sku: produk.kode_sku || produk.sku || "",
          nama_produk: produk.nama_produk || produk.nama || "",
          varian: produk.varian || "",
          qty: 1,
          harga_satuan: Number(produk.harga_jual) || 0,
          diskon_item: 0,
          catatan_item: "",
        },
      ],
    }));
    setProdukSearch("");
    setShowProdukDropdown(false);
  };

  const removeItem = (idx) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) =>
        i === idx ? { ...it, [field]: value } : it,
      ),
    }));
  };

  const subtotal = form.items.reduce(
    (s, it) =>
      s +
      (Number(it.harga_satuan) * Number(it.qty) - Number(it.diskon_item || 0)),
    0,
  );
  const totalHarga = Math.max(0, subtotal - Number(form.diskon));

  const handleSubmit = async (asDraft = true) => {
    if (!form.batas_kirim) {
      showWarning(
        "Tanggal Pesanan Wajib Diisi",
        "Silakan pilih tanggal transaksi pesanan terlebih dahulu.",
      );
      return;
    }
    if (!form.nama_pembeli || !form.nama_pembeli.trim()) {
      showWarning(
        "Nama Pelanggan Wajib Diisi",
        "Pilih data pelanggan dari dropdown Master Pelanggan atau klik tombol '+ Tambah Pelanggan'.",
      );
      return;
    }
    if (!form.items || !form.items.length) {
      showWarning(
        "Daftar Produk Masih Kosong",
        "Tambahkan minimal 1 macam produk ke dalam pesanan melalui kotak pencarian produk.",
      );
      return;
    }
    const invalidQtyItem = form.items.find(
      (it) => !it.qty || Number(it.qty) <= 0,
    );
    if (invalidQtyItem) {
      showWarning(
        "Jumlah Qty Tidak Valid",
        `Jumlah (Qty) untuk produk "${invalidQtyItem.nama_produk || invalidQtyItem.sku}" harus lebih dari 0!`,
      );
      return;
    }

    try {
      const isEdit = Boolean(editingOrderId);
      const targetStatus = asDraft
        ? "draft"
        : isEdit &&
            form.status_pesanan &&
            form.status_pesanan !== "draft"
          ? form.status_pesanan
          : "dikonfirmasi";

      const url = isEdit
        ? `/api/offline/orders/${editingOrderId}`
        : "/api/offline/orders";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          kode_perusahaan: activeCompany.code,
          status_pesanan: targetStatus,
          dibuat_oleh: activeCompany.name || "Admin",
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        toastSuccess(
          isEdit
            ? `Pesanan ${editingNoPesanan || ""} berhasil diperbarui!`
            : `Pesanan ${json.no_pesanan} berhasil ${asDraft ? "disimpan sebagai draft" : "dikonfirmasi"}!`,
        );
        setShowForm(false);
        resetForm();
        loadOrders();
      } else throw new Error(json.message);
    } catch (err) {
      toastError(`Gagal: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/offline/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_pesanan: newStatus }),
      });
      const json = await res.json();
      if (res.ok) {
        toastSuccess(
          `Status diperbarui ke "${newStatus}"${json.no_spk ? ` — SPK: ${json.no_spk}` : ""}`,
        );
        setEditStatusId(null);
        loadOrders();
      } else throw new Error(json.message);
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleUpdateResi = async (id) => {
    try {
      const res = await fetch(`/api/offline/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ no_resi: resiInput, status_pesanan: "dikirim" }),
      });
      if (res.ok) {
        toastSuccess("Resi diperbarui & status → Dikirim");
        setEditResiId(null);
        setResiInput("");
        loadOrders();
      }
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleDelete = async (ord) => {
    const id = typeof ord === "object" ? ord.id : ord;
    const label =
      typeof ord === "object" && ord.no_pesanan
        ? `${ord.no_pesanan} (${ord.nama_pembeli || ""})`
        : "pesanan ini";
    const confirmed = await showConfirm(
      "Hapus Pesanan?",
      `Yakin ingin menghapus ${label}? Data yang dihapus tidak dapat dikembalikan.`,
      "Ya, Hapus",
      "Batal",
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/offline/orders/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toastSuccess("Pesanan berhasil dihapus");
        if (detailOrder && detailOrder.id === id) setDetailOrder(null);
        loadOrders();
      } else {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Gagal menghapus pesanan");
      }
    } catch (err) {
      toastError(err.message);
    }
  };

  // Load detail
  const loadDetail = async (id) => {
    try {
      const res = await fetch(`/api/offline/orders/${id}`);
      const json = await res.json();
      setDetailOrder(json.data || null);
    } catch (e) {
      toastError("Gagal memuat detail");
    }
  };

  // ── Input ke SPK Produksi Handlers ──────────────────────────────────────
  const handleOpenSpkModal = async (idOrOrder) => {
    const id = typeof idOrOrder === "object" ? idOrOrder.id : idOrOrder;
    try {
      const res = await fetch(`/api/offline/orders/${id}`);
      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json.message || "Gagal memuat data pesanan untuk SPK");
      }
      const ord = json.data;
      const nowYmd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const suffix =
        (ord.no_pesanan || "").split("-").pop() ||
        Math.random().toString(36).slice(2, 5).toUpperCase();

      setSpkForm({
        kode_produksi: ord.no_spk || `PRD-OFF-${nowYmd}-${suffix}`,
        id_spk: `SPK-${suffix}`,
        nama_spk: `SPK ${ord.nama_pembeli || "Offline"}`,
        penjahit: "Penjahit Workshop",
        status_spk: "Potong Pola",
        tgl_pesan: ord.batas_kirim
          ? new Date(ord.batas_kirim).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        deadline: new Date(Date.now() + 14 * 86400000)
          .toISOString()
          .slice(0, 10),
        catatan: `Pesanan Offline ${ord.no_pesanan}${ord.catatan ? " — " + ord.catatan : ""}`,
        items: (ord.items || []).map((it) => ({
          sku: it.sku || "",
          nama_produk: it.nama_produk || "",
          varian: it.varian || "",
          qty: Number(it.qty) || 1,
          catatan_item: it.catatan_item || "",
        })),
      });
      setSpkModalOrder(ord);
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleSaveSpk = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!spkModalOrder) return;

    if (!spkForm.kode_produksi || !spkForm.kode_produksi.trim()) {
      showWarning(
        "Kode Produksi Wajib Diisi",
        "Masukkan nomor / kode produksi SPK terlebih dahulu.",
      );
      return;
    }
    if (!spkForm.items || !spkForm.items.length) {
      showWarning(
        "Item Produk Kosong",
        "Tidak ada produk yang dapat dimasukkan ke SPK.",
      );
      return;
    }

    setIsSavingSpk(true);
    try {
      const res = await fetch(`/api/offline/orders/${spkModalOrder.id}/spk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spkForm),
      });
      const json = await res.json();
      if (!res.ok || json.status === "error") {
        throw new Error(json.message || "Gagal memasukkan pesanan ke SPK");
      }

      toastSuccess(
        json.message ||
          `Berhasil dimasukkan ke SPK (${spkForm.kode_produksi})!`,
      );
      const updated = json.data;
      setSpkModalOrder(null);
      if (detailOrder && detailOrder.id === updated.id) {
        setDetailOrder(updated);
      }
      loadOrders();
    } catch (err) {
      toastError(err.message);
    } finally {
      setIsSavingSpk(false);
    }
  };

  // ── Pembayaran / Cicilan Handlers ───────────────────────────────────────
  const handleOpenPaymentModal = async (idOrOrder) => {
    const id = typeof idOrOrder === "object" ? idOrOrder.id : idOrOrder;
    try {
      const res = await fetch(`/api/offline/orders/${id}`);
      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json.message || "Gagal memuat data pembayaran");
      }
      const ord = json.data;
      const sudahBayar =
        ord.status_pembayaran === "lunas"
          ? Number(ord.total_harga || 0)
          : Number(ord.nominal_dp || 0);
      const sisa = Math.max(0, Number(ord.total_harga || 0) - sudahBayar);
      const tahapKe = (ord.pembayaran_list?.length || 0) + 1;

      setPaymentForm({
        tanggal_bayar: new Date().toISOString().slice(0, 10),
        nominal: sisa > 0 ? sisa : 0,
        metode_pembayaran: ord.metode_pembayaran || "cash",
        bank_tujuan: ord.bank_tujuan || "",
        keterangan:
          tahapKe === 1
            ? "Pembayaran ke-1 (DP / Cicilan)"
            : sisa > 0
              ? `Cicilan ke-${tahapKe}`
              : "Pelunasan",
      });
      setPaymentModalOrder(ord);
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleSavePayment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!paymentModalOrder) return;

    if (!paymentForm.nominal || Number(paymentForm.nominal) <= 0) {
      showWarning(
        "Nominal Belum Diisi",
        "Masukkan nominal pembayaran / cicilan lebih dari Rp 0.",
      );
      return;
    }
    if (
      paymentForm.metode_pembayaran === "transfer" &&
      !paymentForm.bank_tujuan
    ) {
      showWarning(
        "Bank Tujuan Belum Dipilih",
        "Pilih rekening bank tujuan transfer terlebih dahulu.",
      );
      return;
    }

    setIsSavingPayment(true);
    try {
      const res = await fetch(
        `/api/offline/orders/${paymentModalOrder.id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentForm),
        },
      );
      const json = await res.json();
      if (!res.ok || json.status === "error") {
        throw new Error(json.message || "Gagal menyimpan pembayaran");
      }

      toastSuccess(json.message || "Pembayaran berhasil disimpan");
      const updated = json.data;
      setPaymentModalOrder(updated);
      if (detailOrder && detailOrder.id === updated.id) {
        setDetailOrder(updated);
      }
      loadOrders();

      const sudahBayar =
        updated.status_pembayaran === "lunas"
          ? Number(updated.total_harga || 0)
          : Number(updated.nominal_dp || 0);
      const sisa = Math.max(0, Number(updated.total_harga || 0) - sudahBayar);
      const nextTahap = (updated.pembayaran_list?.length || 0) + 1;
      setPaymentForm((prev) => ({
        ...prev,
        nominal: sisa > 0 ? sisa : 0,
        keterangan: sisa > 0 ? `Cicilan ke-${nextTahap}` : "Pelunasan",
      }));
    } catch (err) {
      toastError(err.message);
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDeletePayment = async (orderId, paymentId) => {
    const confirmed = await showConfirm(
      "Hapus Riwayat Pembayaran?",
      "Data cicilan ini akan dihapus dan sisa tagihan akan dihitung ulang.",
      "Ya, Hapus",
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/offline/orders/${orderId}/payments/${paymentId}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok || json.status === "error") {
        throw new Error(json.message || "Gagal menghapus pembayaran");
      }
      toastSuccess("Riwayat pembayaran dihapus");
      const updated = json.data;
      if (paymentModalOrder && paymentModalOrder.id === orderId) {
        setPaymentModalOrder(updated);
      }
      if (detailOrder && detailOrder.id === orderId) {
        setDetailOrder(updated);
      }
      loadOrders();
    } catch (err) {
      toastError(err.message);
    }
  };

  // ── Filtered + paginated ────────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    if (filterStatus !== "semua" && o.status_pesanan !== filterStatus) {
      return false;
    }
    if (filterToko !== "Semua" && (o.nama_toko || "-") !== filterToko) {
      return false;
    }
    if (
      filterPembayaran !== "Semua" &&
      o.status_pembayaran !== filterPembayaran
    ) {
      return false;
    }
    if (search) {
      const s = search.toLowerCase();
      const match = [
        o.no_pesanan,
        o.nama_pembeli,
        o.no_telepon,
        o.no_resi,
        o.ringkasan_produk,
        o.nama_toko,
      ].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(s),
      );
      if (!match) return false;
    }
    return true;
  });
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / entriesPerPage));
  const paginated = filtered.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage,
  );

  // Summary counts
  const countByStatus = (st) =>
    orders.filter((o) => o.status_pesanan === st).length;

  const getStatusBadge = (status) => {
    const s = STATUS_LIST.find((x) => x.value === status) || STATUS_LIST[0];
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 10px",
          borderRadius: "4px",
          fontSize: "10.5px",
          fontWeight: "800",
          backgroundColor: s.bg,
          color: s.color,
          border: `1px solid ${s.color}40`,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {s.label}
      </span>
    );
  };

  // Product search filtered list (sorted & single filter)
  const filteredProduk = useMemo(() => {
    if (!masterProduk.length) return [];

    let pool = masterProduk;
    if (filterSingleOnly) {
      pool = pool.filter(isSingleProduct);
    }

    if (!produkSearch.trim()) {
      return [...pool].sort(compareProducts).slice(0, 30);
    }

    const s = produkSearch.toLowerCase();
    return pool
      .filter((p) => {
        return (
          (p.nama_produk || "").toLowerCase().includes(s) ||
          (p.kode_sku || "").toLowerCase().includes(s)
        );
      })
      .sort(compareProducts)
      .slice(0, 40);
  }, [masterProduk, produkSearch, filterSingleOnly]);

  const tokoFilterOptions = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      if (o.nama_toko) set.add(o.nama_toko);
    });
    stores.forEach((s) => {
      if (s.nama_toko) set.add(s.nama_toko);
    });
    return Array.from(set);
  }, [orders, stores]);

  const TABS_CONFIG = [
    {
      value: "semua",
      label: `Semua Pesanan (${orders.length})`,
      icon: Layers,
      activeBorder: "#0284c7",
      inactiveBorder: "#bfdbfe",
      activeBg: "#0284c7",
      inactiveBg: "#eff6ff",
      inactiveColor: "#1d4ed8",
      shadow: "rgba(2, 132, 199, 0.25)",
    },
    {
      value: "draft",
      label: `Draft (${countByStatus("draft")})`,
      icon: FileText,
      activeBorder: "#475569",
      inactiveBorder: "#cbd5e1",
      activeBg: "#475569",
      inactiveBg: "#f8fafc",
      inactiveColor: "#334155",
      shadow: "rgba(71, 85, 105, 0.25)",
    },
    {
      value: "dikonfirmasi",
      label: `Dikonfirmasi (${countByStatus("dikonfirmasi")})`,
      icon: Clock,
      activeBorder: "#d97706",
      inactiveBorder: "#fde68a",
      activeBg: "#d97706",
      inactiveBg: "#fffbeb",
      inactiveColor: "#b45309",
      shadow: "rgba(217, 119, 6, 0.25)",
    },
    {
      value: "diproses",
      label: `Diproses (${countByStatus("diproses")})`,
      icon: Package,
      activeBorder: "#2563eb",
      inactiveBorder: "#bfdbfe",
      activeBg: "#2563eb",
      inactiveBg: "#eff6ff",
      inactiveColor: "#1d4ed8",
      shadow: "rgba(37, 99, 235, 0.25)",
    },
    {
      value: "siap_kirim",
      label: `Siap Kirim (${countByStatus("siap_kirim")})`,
      icon: Store,
      activeBorder: "#7c3aed",
      inactiveBorder: "#ddd6fe",
      activeBg: "#7c3aed",
      inactiveBg: "#f5f3ff",
      inactiveColor: "#6d28d9",
      shadow: "rgba(124, 58, 237, 0.25)",
    },
    {
      value: "dikirim",
      label: `Dikirim (${countByStatus("dikirim")})`,
      icon: Truck,
      activeBorder: "#0891b2",
      inactiveBorder: "#a5f3fc",
      activeBg: "#0891b2",
      inactiveBg: "#ecfeff",
      inactiveColor: "#0e7490",
      shadow: "rgba(8, 145, 178, 0.25)",
    },
    {
      value: "selesai",
      label: `Selesai (${countByStatus("selesai")})`,
      icon: CheckCircle,
      activeBorder: "#059669",
      inactiveBorder: "#a7f3d0",
      activeBg: "#059669",
      inactiveBg: "#ecfdf5",
      inactiveColor: "#047857",
      shadow: "rgba(5, 150, 105, 0.25)",
    },
    {
      value: "dibatalkan",
      label: `Dibatalkan (${countByStatus("dibatalkan")})`,
      icon: XCircle,
      activeBorder: "#ef4444",
      inactiveBorder: "#fecaca",
      activeBg: "#ef4444",
      inactiveBg: "#fef2f2",
      inactiveColor: "#b91c1c",
      shadow: "rgba(239, 68, 68, 0.25)",
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        padding: "8px 16px",
        boxSizing: "border-box",
      }}
    >
      {/* MASTER CONTAINER CARD (MATCHING DATA PRODUK) */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "10px",
          padding: "12px 14px",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
        }}
      >
        {/* HEADER TITLE & ACTION BUTTONS (BERWARNA BLUE GRADIENT) */}
        <div
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            borderRadius: "8px",
            padding: "10px 16px",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "6px",
            boxShadow: "0 2px 6px rgba(2, 132, 199, 0.22)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backdropFilter: "blur(4px)",
              }}
            >
              <Send size={20} />
            </div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: "800",
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                  }}
                >
                  Data Penjualan & Pesanan Offline
                </h1>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    padding: "1.5px 7px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                  }}
                >
                  {activeCompany?.code || "RSG"}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  color: "rgba(255, 255, 255, 0.88)",
                }}
              >
                Catat & kelola transaksi manual pelanggan, Dropship, Reseller,
                Walk-in, dan Toko/Instansi. Otomatis potong stok & buat SPK.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("pesanan_masuk")}
                style={{
                  height: "30px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "0 13px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "700",
                  lineHeight: 1,
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#047857")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#059669")
                }
              >
                <ShoppingBag size={13} />
                <span>Pesanan Marketplace</span>
              </button>
            )}

            <button
              type="button"
              id="btn-tambah-pesanan-offline"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              style={{
                height: "30px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "0 14px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#ffffff",
                color: "#0284c7",
                fontSize: "12px",
                fontWeight: "800",
                lineHeight: 1,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f0f9ff")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#ffffff")
              }
            >
              <Plus size={14} />
              <span>Buat Pesanan Baru</span>
            </button>
          </div>
        </div>

        {/* FILTER TABS (BERWARNA COLOR-CODED SEPERTI DATA PRODUK) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "6px",
            flexWrap: "wrap",
          }}
        >
          {TABS_CONFIG.map((tab) => {
            const IconComp = tab.icon;
            const isActive = filterStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setFilterStatus(tab.value);
                  setCurrentPage(1);
                }}
                style={{
                  height: "28px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "0 12px",
                  borderRadius: "6px",
                  border: isActive
                    ? `1px solid ${tab.activeBorder}`
                    : `1px solid ${tab.inactiveBorder}`,
                  backgroundColor: isActive ? tab.activeBg : tab.inactiveBg,
                  color: isActive ? "#ffffff" : tab.inactiveColor,
                  fontSize: "12px",
                  fontWeight: "700",
                  lineHeight: 1,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? `0 1px 4px ${tab.shadow}` : "none",
                }}
              >
                <IconComp size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* FILTER CONTROLS BAR (MEPET 5-6PX SEPERTI DATA PRODUK) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "8px 12px",
            marginBottom: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
          }}
        >
          {/* Search input with icon */}
          <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
            <Search
              size={14}
              color="#94a3b8"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari no pesanan, nama pelanggan, no HP, produk, resi..."
              style={{
                width: "100%",
                padding: "6px 10px 6px 32px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                outline: "none",
                backgroundColor: "#f8fafc",
                transition: "all 0.15s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#0284c7";
                e.target.style.backgroundColor = "#ffffff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#cbd5e1";
                e.target.style.backgroundColor = "#f8fafc";
              }}
            />
          </div>

          {/* Select Toko / Instansi */}
          <select
            value={filterToko}
            onChange={(e) => {
              setFilterToko(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              color: "#334155",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              minWidth: "135px",
            }}
          >
            <option value="Semua">Semua Toko / Instansi</option>
            {tokoFilterOptions.map((tk, idx) => (
              <option key={idx} value={tk}>
                {tk}
              </option>
            ))}
          </select>

          {/* Select Status Pembayaran */}
          <select
            value={filterPembayaran}
            onChange={(e) => {
              setFilterPembayaran(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              color: "#334155",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              minWidth: "130px",
            }}
          >
            <option value="Semua">Semua Pembayaran</option>
            <option value="lunas">Lunas</option>
            <option value="dp">DP (Down Payment)</option>
            <option value="belum_bayar">Belum Bayar</option>
          </select>

          {/* Select Baris Per Halaman (Paging) */}
          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              color: "#334155",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              minWidth: "105px",
            }}
          >
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadOrders()}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              color: "#334155",
              cursor: "pointer",
              fontWeight: "700",
              backgroundColor: "#f8fafc",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#f1f5f9")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#f8fafc")
            }
          >
            <RefreshCw size={13} color="#0284c7" />
            <span>Refresh</span>
          </button>
        </div>

        {/* DATA TABLE (MATCHING DATA PRODUK) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              className="table-bordered-hover"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "12px",
                border: "1px solid #cbd5e1",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    color: "#475569",
                    fontSize: "11px",
                    fontWeight: "800",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <th
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      width: "45px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    NO
                  </th>
                  <th
                    style={{ padding: "5px 8px", border: "1px solid #cbd5e1" }}
                  >
                    NO PESANAN & TANGGAL
                  </th>
                  <th
                    style={{ padding: "5px 8px", border: "1px solid #cbd5e1" }}
                  >
                    PELANGGAN
                  </th>
                  <th
                    style={{ padding: "5px 8px", border: "1px solid #cbd5e1" }}
                  >
                    TOKO / INSTANSI
                  </th>
                  <th
                    style={{
                      padding: "5px 8px",
                      border: "1px solid #cbd5e1",
                      textAlign: "right",
                    }}
                  >
                    TOTAL TAGIHAN
                  </th>
                  <th
                    style={{ padding: "5px 8px", border: "1px solid #cbd5e1" }}
                  >
                    RESI & KURIR
                  </th>
                  <th
                    style={{
                      padding: "5px 8px",
                      border: "1px solid #cbd5e1",
                      textAlign: "center",
                    }}
                  >
                    STATUS
                  </th>
                  <th
                    style={{
                      padding: "5px 8px",
                      border: "1px solid #cbd5e1",
                      textAlign: "center",
                      width: "140px",
                    }}
                  >
                    AKSI
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        padding: "48px 16px",
                        textAlign: "center",
                        backgroundColor: "#fbfcfe",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "46px",
                            height: "46px",
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 12px rgba(2, 132, 199, 0.12)",
                          }}
                        >
                          <Loader2
                            size={24}
                            color="#0284c7"
                            className="animate-spin"
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "13.5px",
                              fontWeight: "800",
                              color: "#0f172a",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            Menarik Data Pesanan Offline...
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#64748b",
                              marginTop: "3px",
                            }}
                          >
                            Sinkronisasi transaksi & status pembayaran dari
                            database MySQL
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        padding: "24px 16px",
                        textAlign: "center",
                        color: "#64748b",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <Package
                        size={32}
                        color="#cbd5e1"
                        style={{ marginBottom: "6px" }}
                      />
                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "13px",
                          color: "#334155",
                        }}
                      >
                        Tidak ada pesanan offline ditemukan
                      </div>
                      <div style={{ fontSize: "11px", marginTop: "2px" }}>
                        Klik tombol &quot;Buat Pesanan Baru&quot; atau ubah
                        filter pencarian.
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((ord, index) => {
                    const rowNumber =
                      (currentPage - 1) * entriesPerPage + index + 1;
                    return (
                      <tr
                        key={ord.id}
                        style={{
                          backgroundColor: "transparent",
                          transition: "background-color 0.15s ease",
                          cursor: "default",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f1f5f9";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {/* NO */}
                        <td
                          style={{
                            padding: "5px 8px",
                            textAlign: "center",
                            color: "#64748b",
                            fontWeight: "600",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          {rowNumber}
                        </td>

                        {/* NO PESANAN & TANGGAL */}
                        <td
                          style={{
                            padding: "5px 8px",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "700",
                              color: "#0f172a",
                              fontSize: "12px",
                              lineHeight: 1.2,
                            }}
                          >
                            {ord.no_pesanan}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#0284c7",
                              fontWeight: "600",
                            }}
                          >
                            {new Date(ord.dibuat_pada).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </div>
                        </td>

                        {/* PELANGGAN */}
                        <td
                          style={{
                            padding: "5px 8px",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "700",
                              color: "#0f172a",
                              fontSize: "12px",
                              lineHeight: 1.2,
                            }}
                          >
                            {ord.nama_pembeli}
                          </div>
                          {ord.no_telepon && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#64748b",
                                marginTop: "2px",
                              }}
                            >
                              {ord.no_telepon}
                            </div>
                          )}
                          {ord.is_dropship === 1 && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#7c3aed",
                                fontWeight: "700",
                                marginTop: "2px",
                              }}
                            >
                              ↳ DS: {ord.nama_pengirim_ds || "-"}
                            </div>
                          )}
                        </td>

                        {/* TOKO / INSTANSI */}
                        <td
                          style={{
                            padding: "5px 8px",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          {ord.nama_toko ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                fontSize: "10.5px",
                                fontWeight: "700",
                                backgroundColor: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                              }}
                            >
                              <Store size={11} />
                              <span>{ord.nama_toko}</span>
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>-</span>
                          )}
                        </td>

                        {/* TOTAL */}
                        <td
                          style={{
                            padding: "5px 8px",
                            border: "1px solid #cbd5e1",
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "800",
                              color: "#059669",
                              fontSize: "12px",
                            }}
                          >
                            {formatRupiah(ord.total_harga)}
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#64748b",
                              marginTop: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "800",
                                padding: "1px 5px",
                                borderRadius: "3px",
                                backgroundColor:
                                  ord.jenis_transaksi === "kredit"
                                    ? "#fef3c7"
                                    : "#e0f2fe",
                                color:
                                  ord.jenis_transaksi === "kredit"
                                    ? "#b45309"
                                    : "#0369a1",
                              }}
                            >
                              {ord.jenis_transaksi === "kredit"
                                ? "Kredit"
                                : "Tunai"}
                            </span>
                            {" · "}
                            <span
                              onClick={() => handleOpenPaymentModal(ord.id)}
                              title="Klik untuk kelola pembayaran / cicilan"
                              style={{
                                fontWeight: "700",
                                cursor: "pointer",
                                textDecoration:
                                  ord.status_pembayaran !== "lunas"
                                    ? "underline"
                                    : "none",
                                color:
                                  ord.status_pembayaran === "lunas"
                                    ? "#059669"
                                    : ord.status_pembayaran === "dp"
                                      ? "#d97706"
                                      : "#dc2626",
                              }}
                            >
                              {ord.status_pembayaran === "lunas"
                                ? "✓ Lunas"
                                : ord.status_pembayaran === "dp"
                                  ? `Cicilan ${formatRupiah(ord.nominal_dp)} (Sisa ${formatRupiah(Math.max(0, Number(ord.total_harga || 0) - Number(ord.nominal_dp || 0)))})`
                                  : "Belum bayar (Klik Bayar)"}
                            </span>
                          </div>
                        </td>

                        {/* RESI & KURIR */}
                        <td
                          style={{
                            padding: "5px 8px",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          {editResiId === ord.id ? (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <input
                                value={resiInput}
                                onChange={(e) => setResiInput(e.target.value)}
                                placeholder="No resi..."
                                style={{
                                  width: "100px",
                                  padding: "3px 6px",
                                  fontSize: "11px",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                }}
                              />
                              <button
                                onClick={() => handleUpdateResi(ord.id)}
                                style={{
                                  padding: "3px 6px",
                                  fontSize: "10px",
                                  border: "none",
                                  borderRadius: "4px",
                                  backgroundColor: "#0284c7",
                                  color: "#fff",
                                  cursor: "pointer",
                                  fontWeight: "700",
                                }}
                              >
                                OK
                              </button>
                              <button
                                onClick={() => setEditResiId(null)}
                                style={{
                                  padding: "3px 6px",
                                  fontSize: "10px",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  backgroundColor: "#fff",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <>
                              <div
                                style={{
                                  fontSize: "11.5px",
                                  fontWeight: "600",
                                  color: "#334155",
                                }}
                              >
                                {ord.kurir || "-"}
                              </div>
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: ord.no_resi ? "#0284c7" : "#94a3b8",
                                  fontWeight: ord.no_resi ? "700" : "400",
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  setEditResiId(ord.id);
                                  setResiInput(ord.no_resi || "");
                                }}
                              >
                                {ord.no_resi || "Klik untuk input resi"}
                              </div>
                            </>
                          )}
                        </td>

                        {/* STATUS */}
                        <td
                          style={{
                            padding: "5px 8px",
                            border: "1px solid #cbd5e1",
                            textAlign: "center",
                          }}
                        >
                          {editStatusId === ord.id ? (
                            <div style={{ width: "130px", margin: "0 auto" }}>
                              <SearchableSelect
                                value={ord.status_pesanan}
                                onChange={(val) =>
                                  handleUpdateStatus(ord.id, val)
                                }
                                options={STATUS_LIST.map((s) => ({
                                  value: s.value,
                                  label: s.label,
                                  color: s.color,
                                }))}
                                size="sm"
                              />
                            </div>
                          ) : (
                            <div
                              style={{ cursor: "pointer" }}
                              onClick={() => setEditStatusId(ord.id)}
                              title="Klik untuk ubah status pesanan"
                            >
                              {getStatusBadge(ord.status_pesanan)}
                            </div>
                          )}
                          {ord.no_spk && (
                            <div
                              style={{
                                fontSize: "9.5px",
                                color: "#7c3aed",
                                fontWeight: "700",
                                marginTop: "3px",
                              }}
                            >
                              SPK: {ord.no_spk}
                            </div>
                          )}
                        </td>

                        {/* ACTION BUTTONS (Detail, Edit, Konfirmasi, Hapus - Matching Data Produk) */}
                        <td
                          style={{
                            padding: "5px 8px",
                            border: "1px solid #cbd5e1",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {/* 1. Detail Eye Button (Teal / Cyan) */}
                            <button
                              type="button"
                              onClick={() => loadDetail(ord.id)}
                              title="Lihat Detail Pesanan"
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor: "#06b6d4",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "opacity 0.15s ease",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = "0.85")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = "1")
                              }
                            >
                              <Eye size={13} />
                            </button>

                            {/* 2. Bayar / Cicilan Button (Emerald Green / Amber) */}
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(ord.id)}
                              title={
                                ord.status_pembayaran === "lunas"
                                  ? "Riwayat Pembayaran (Sudah Lunas)"
                                  : "Input Pembayaran / Cicilan"
                              }
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor:
                                  ord.status_pembayaran === "lunas"
                                    ? "#10b981"
                                    : "#f59e0b",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "opacity 0.15s ease",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = "0.85")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = "1")
                              }
                            >
                              <DollarSign size={13} />
                            </button>

                            {/* 3. Input ke SPK Button (Purple / Indigo) */}
                            <button
                              type="button"
                              onClick={() => handleOpenSpkModal(ord.id)}
                              title={
                                ord.no_spk
                                  ? `Sudah Masuk SPK: ${ord.no_spk} (Klik untuk lihat / update)`
                                  : "Input Pesanan ke SPK Produksi"
                              }
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor: ord.no_spk
                                  ? "#4f46e5"
                                  : "#8b5cf6",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "opacity 0.15s ease",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = "0.85")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = "1")
                              }
                            >
                              <ClipboardList size={13} />
                            </button>

                            {/* 4. Edit Pencil Button (Blue) */}
                            <button
                              type="button"
                              onClick={() => handleEditOrder(ord.id)}
                              title="Edit Data Pesanan"
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor: "#0284c7",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "opacity 0.15s ease",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = "0.85")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = "1")
                              }
                            >
                              <Edit3 size={13} />
                            </button>

                            {/* 3. Konfirmasi Draft Button (Green) */}
                            {ord.status_pesanan === "draft" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(ord.id, "dikonfirmasi")
                                }
                                title="Konfirmasi Pesanan"
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "4px",
                                  border: "none",
                                  backgroundColor: "#059669",
                                  color: "#ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "opacity 0.15s ease",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.opacity = "0.85")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.opacity = "1")
                                }
                              >
                                <CheckCircle2 size={13} />
                              </button>
                            )}

                            {/* 4. Delete Trash Button (Red) */}
                            <button
                              type="button"
                              onClick={() => handleDelete(ord)}
                              title="Hapus Pesanan"
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor: "#ef4444",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "opacity 0.15s ease",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = "0.85")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = "1")
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGING FOOTER (MATCHING DATA PRODUK) */}
          <div
            style={{
              padding: "8px 14px",
              borderTop: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
              fontSize: "11.5px",
              color: "#64748b",
            }}
          >
            <div>
              Menampilkan{" "}
              <strong>
                {totalCount === 0
                  ? 0
                  : (currentPage - 1) * entriesPerPage + 1}
              </strong>{" "}
              sampai{" "}
              <strong>
                {Math.min(currentPage * entriesPerPage, totalCount)}
              </strong>{" "}
              dari <strong>{totalCount}</strong> pesanan
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: "4px 12px",
                  borderRadius: "5px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: currentPage <= 1 ? "#f1f5f9" : "#ffffff",
                  color: currentPage <= 1 ? "#94a3b8" : "#334155",
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  transition: "all 0.15s ease",
                }}
              >
                Sebelumnya
              </button>
              <span
                style={{
                  padding: "0 8px",
                  fontWeight: "800",
                  color: "#0f172a",
                  fontSize: "12px",
                }}
              >
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                style={{
                  padding: "4px 12px",
                  borderRadius: "5px",
                  border: "1px solid #cbd5e1",
                  backgroundColor:
                    currentPage >= totalPages ? "#f1f5f9" : "#ffffff",
                  color: currentPage >= totalPages ? "#94a3b8" : "#334155",
                  cursor:
                    currentPage >= totalPages ? "not-allowed" : "pointer",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  transition: "all 0.15s ease",
                }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: BUAT PESANAN OFFLINE (FULL SCREEN COMPACT - MASTER PRODUK)   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#0f172a",
            zIndex: 2000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Modal Header (Dark Slate Fullscreen Compact) */}
          <div
            style={{
              height: "42px",
              padding: "0 16px",
              background:
                "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)",
              borderBottom: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Send size={14} />
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "#ffffff",
                  letterSpacing: "-0.01em",
                }}
              >
                {editingOrderId
                  ? `Edit Pesanan Offline — ${editingNoPesanan}`
                  : "Buat Pesanan Offline Baru"}
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b" }}>•</span>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                Formulir Transaksi Manual Pelanggan, Reseller & Walk-in
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "5px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(239, 68, 68, 0.2)";
                e.currentTarget.style.color = "#ef4444";
                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.color = "#cbd5e1";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Modal Form Body (Fullscreen 2-Column Compact Layout) */}
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(false);
            }}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px",
              backgroundColor: "#f1f5f9",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
                gap: "10px",
                alignItems: "start",
              }}
            >
              {/* ═════════════════════════════════════════════════════════ */}
              {/* KOLOM KIRI: INFO TRANSAKSI & PELANGGAN                  */}
              {/* ═════════════════════════════════════════════════════════ */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* 1. INFO TRANSAKSI & JADWAL */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "10px 12px",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "8px",
                      paddingBottom: "5px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <Calendar size={13} color="#0284c7" />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        color: "#0f172a",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      1. Info Transaksi & Toko
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1.2fr",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#334155",
                          marginBottom: "3px",
                        }}
                      >
                        Tanggal Pesanan{" "}
                        <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={form.batas_kirim}
                        onChange={(e) =>
                          setForm({ ...form, batas_kirim: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          fontSize: "11.5px",
                          fontWeight: "600",
                          color: "#0f172a",
                          backgroundColor: "#ffffff",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#334155",
                          marginBottom: "3px",
                        }}
                      >
                        Toko / Instansi Asal
                      </label>
                      <SearchableSelect
                        value={form.id_toko}
                        onChange={(val) => {
                          const st = stores.find(
                            (s) => String(s.id) === String(val),
                          );
                          setForm({
                            ...form,
                            id_toko: val,
                            nama_toko: st ? st.shopName : "",
                          });
                        }}
                        options={[
                          { value: "", label: "-- Pilih Toko / Instansi --" },
                          ...stores.map((s) => ({
                            value: String(s.id),
                            label: s.shopName,
                            subtitle: s.channel
                              ? `Channel: ${s.channel}`
                              : undefined,
                          })),
                        ]}
                        placeholder="Pilih Toko"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. IDENTITAS PELANGGAN & ALAMAT */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "10px 12px",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                      paddingBottom: "5px",
                      borderBottom: "1px solid #f1f5f9",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Users size={13} color="#0284c7" />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: "#0f172a",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        2. Identitas Pelanggan & Alamat
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleOpenAddPelanggan}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 9px",
                          borderRadius: "4px",
                          backgroundColor: "#0284c7",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          cursor: "pointer",
                          boxShadow: "0 1px 2px rgba(2, 132, 199, 0.25)",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#0369a1")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "#0284c7")
                        }
                        title="Tambah data pelanggan baru"
                      >
                        <Plus size={11} strokeWidth={2.5} />
                        <span>+ Tambah Pelanggan</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenEditPelanggan}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 9px",
                          borderRadius: "4px",
                          backgroundColor: form.nama_pembeli
                            ? "#f8fafc"
                            : "#f1f5f9",
                          color: form.nama_pembeli ? "#0284c7" : "#94a3b8",
                          border: `1px solid ${form.nama_pembeli ? "#0284c7" : "#cbd5e1"}`,
                          fontSize: "10.5px",
                          fontWeight: "700",
                          cursor: form.nama_pembeli ? "pointer" : "not-allowed",
                          transition: "all 0.15s ease",
                        }}
                        title={
                          form.nama_pembeli
                            ? "Ubah data pelanggan terpilih"
                            : "Pilih atau isi pelanggan terlebih dahulu"
                        }
                      >
                        <Edit3 size={11} strokeWidth={2.5} />
                        <span>Edit Pelanggan</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Pick Master Pelanggan */}
                  <div
                    style={{
                      marginBottom: "8px",
                      padding: "7px 9px",
                      borderRadius: "6px",
                      backgroundColor: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "3px",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          fontSize: "10px",
                          fontWeight: "700",
                          color: "#64748b",
                        }}
                      >
                        ⚡ Pilih dari Master Pelanggan Terdaftar:
                      </label>
                      {form.nama_pembeli && (
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: "700",
                            color: "#0284c7",
                            backgroundColor: "#e0f2fe",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Terhubung Master
                        </span>
                      )}
                    </div>
                    <SearchableSelect
                      value={selectedPelangganId}
                      onChange={(val) => {
                        setSelectedPelangganId(val);
                        if (!val) {
                          setForm((prev) => ({
                            ...prev,
                            nama_pembeli: "",
                            no_telepon: "",
                            alamat_pengiriman: "",
                          }));
                          return;
                        }
                        const cust = pelangganList.find(
                          (p) => String(p.id) === String(val),
                        );
                        if (cust) {
                          setForm((prev) => ({
                            ...prev,
                            nama_pembeli:
                              cust.nama_pelanggan || cust.nama || "",
                            no_telepon: cust.no_hp || cust.telepon || "",
                            alamat_pengiriman: cust.alamat || "",
                          }));
                        }
                      }}
                      options={[
                        {
                          value: "",
                          label: "-- Pilih / Cari Pelanggan Terdaftar --",
                        },
                        ...pelangganList.map((p) => ({
                          value: String(p.id),
                          label: `${p.nama_pelanggan || p.nama} (${p.kode_pelanggan || "CUST"})`,
                          subtitle: [p.no_hp, p.alamat]
                            .filter(Boolean)
                            .join(" · "),
                        })),
                      ]}
                      placeholder="Cari pelanggan berdasarkan nama, HP, atau alamat..."
                      isClearable={true}
                      size="sm"
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "3px",
                        }}
                      >
                        <label
                          style={{
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#334155",
                          }}
                        >
                          Nama Pelanggan{" "}
                          <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <span
                          style={{
                            fontSize: "8.5px",
                            fontWeight: "700",
                            color: "#64748b",
                            backgroundColor: "#f1f5f9",
                            border: "1px solid #e2e8f0",
                            padding: "1px 5px",
                            borderRadius: "3px",
                          }}
                        >
                          Readonly
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={form.nama_pembeli}
                        placeholder="(Pilih pelanggan di atas atau klik '+ Tambah Pelanggan')"
                        onClick={() => {
                          if (form.nama_pembeli) handleOpenEditPelanggan();
                          else handleOpenAddPelanggan();
                        }}
                        style={{
                          width: "100%",
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          fontSize: "11.5px",
                          fontWeight: "700",
                          color: "#0f172a",
                          backgroundColor: "#f8fafc",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                        title="Klik untuk membuka modal ubah data pelanggan"
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "3px",
                        }}
                      >
                        <label
                          style={{
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#334155",
                          }}
                        >
                          No Telepon / WhatsApp
                        </label>
                        <span
                          style={{
                            fontSize: "8.5px",
                            fontWeight: "700",
                            color: "#64748b",
                            backgroundColor: "#f1f5f9",
                            border: "1px solid #e2e8f0",
                            padding: "1px 5px",
                            borderRadius: "3px",
                          }}
                        >
                          Readonly
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={form.no_telepon}
                        placeholder="-"
                        onClick={() => {
                          if (form.nama_pembeli) handleOpenEditPelanggan();
                          else handleOpenAddPelanggan();
                        }}
                        style={{
                          width: "100%",
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          fontSize: "11.5px",
                          fontWeight: "600",
                          color: "#0f172a",
                          backgroundColor: "#f8fafc",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                        title="Klik untuk membuka modal ubah data pelanggan"
                      />
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "3px",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#334155",
                        }}
                      >
                        Alamat Lengkap Pengiriman
                      </label>
                      <span
                        style={{
                          fontSize: "8.5px",
                          fontWeight: "700",
                          color: "#64748b",
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          padding: "1px 5px",
                          borderRadius: "3px",
                        }}
                      >
                        Readonly
                      </span>
                    </div>
                    <textarea
                      readOnly
                      value={form.alamat_pengiriman}
                      placeholder="-"
                      rows={2}
                      onClick={() => {
                        if (form.nama_pembeli) handleOpenEditPelanggan();
                        else handleOpenAddPelanggan();
                      }}
                      style={{
                        width: "100%",
                        padding: "6px 9px",
                        borderRadius: "5px",
                        border: "1px solid #cbd5e1",
                        fontSize: "11.5px",
                        fontWeight: "500",
                        color: "#0f172a",
                        backgroundColor: "#f8fafc",
                        resize: "none",
                        cursor: "pointer",
                        boxSizing: "border-box",
                      }}
                      title="Klik untuk membuka modal ubah data pelanggan"
                    />
                  </div>
                </div>

                {/* 3. CATATAN KHUSUS PESANAN */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "10px 12px",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "8px",
                      paddingBottom: "5px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <FileText size={13} color="#0284c7" />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        color: "#0f172a",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      3. Catatan Khusus Pesanan
                    </span>
                  </div>
                  <textarea
                    value={form.catatan}
                    onChange={(e) =>
                      setForm({ ...form, catatan: e.target.value })
                    }
                    placeholder="Contoh: Titip ke satpam, sertakan kartu ucapan, bordir nama di saku kiri..."
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontWeight: "500",
                      color: "#0f172a",
                      backgroundColor: "#ffffff",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* ═════════════════════════════════════════════════════════ */}
              {/* KOLOM KANAN: PRODUK & PEMBAYARAN                        */}
              {/* ═════════════════════════════════════════════════════════ */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* 4. DAFTAR PRODUK PESANAN */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "10px 12px",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                      paddingBottom: "5px",
                      borderBottom: "1px solid #f1f5f9",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Package size={13} color="#0284c7" />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: "#0f172a",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        4. Daftar Produk Pesanan
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: filterSingleOnly ? "#0369a1" : "#64748b",
                          cursor: "pointer",
                          backgroundColor: filterSingleOnly
                            ? "#e0f2fe"
                            : "#f1f5f9",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          border: `1px solid ${filterSingleOnly ? "#7dd3fc" : "#cbd5e1"}`,
                          userSelect: "none",
                          transition: "all 0.15s ease",
                        }}
                        title="Aktifkan untuk hanya memunculkan produk Single (Bundle/Set disembunyikan)"
                      >
                        <input
                          type="checkbox"
                          checked={filterSingleOnly}
                          onChange={(e) =>
                            setFilterSingleOnly(e.target.checked)
                          }
                          style={{
                            cursor: "pointer",
                            margin: 0,
                            width: "12px",
                            height: "12px",
                          }}
                        />
                        <span>Hanya Single</span>
                      </label>

                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "1px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#f0f9ff",
                          color: "#0284c7",
                          border: "1px solid #bae6fd",
                        }}
                      >
                        {form.items.length} Macam Item
                      </span>
                    </div>
                  </div>

                  {/* Autocomplete Input */}
                  <div style={{ position: "relative", marginBottom: "8px" }}>
                    <Search
                      size={13}
                      color="#0284c7"
                      style={{
                        position: "absolute",
                        left: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    />
                    <input
                      value={produkSearch}
                      onChange={(e) => {
                        setProdukSearch(e.target.value);
                        setShowProdukDropdown(true);
                      }}
                      onFocus={() => setShowProdukDropdown(true)}
                      placeholder={
                        filterSingleOnly
                          ? "Cari SKU / nama produk Single (contoh: BB-TH-BIRU)..."
                          : "Cari SKU / nama produk (Semua: Single & Bundle)..."
                      }
                      style={{
                        width: "100%",
                        padding: "6px 28px 6px 28px",
                        borderRadius: "5px",
                        border: "1px solid #cbd5e1",
                        fontSize: "11.5px",
                        fontWeight: "600",
                        backgroundColor: "#f8fafc",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {produkSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setProdukSearch("");
                          setShowProdukDropdown(false);
                        }}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#94a3b8",
                          padding: "2px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Hapus pencarian"
                      >
                        <X size={12} />
                      </button>
                    )}

                    {showProdukDropdown && filteredProduk.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 3500,
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          boxShadow: "0 12px 24px -4px rgba(0, 0, 0, 0.22)",
                          maxHeight: "220px",
                          overflowY: "auto",
                          marginTop: "4px",
                        }}
                      >
                        {filteredProduk.map((p, i) => (
                          <div
                            key={i}
                            onClick={() => addItem(p)}
                            style={{
                              padding: "7px 10px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              fontSize: "11.5px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              transition: "background-color 0.1s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#f0f9ff")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#ffffff")
                            }
                          >
                            <div
                              style={{
                                overflow: "hidden",
                                paddingRight: "8px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: "700",
                                    color: "#0284c7",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {p.kode_sku || "NO-SKU"}
                                </span>
                                <span
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: "700",
                                    padding: "1px 5px",
                                    borderRadius: "3px",
                                    backgroundColor: isSingleProduct(p)
                                      ? "#f0fdf4"
                                      : "#f5f3ff",
                                    color: isSingleProduct(p)
                                      ? "#16a34a"
                                      : "#7c3aed",
                                    border: `1px solid ${isSingleProduct(p) ? "#bbf7d0" : "#ddd6fe"}`,
                                  }}
                                >
                                  {isSingleProduct(p) ? "Single" : "Bundle"}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#475569",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {p.nama_produk}
                              </div>
                            </div>
                            <div
                              style={{
                                fontWeight: "800",
                                color: "#16a34a",
                                flexShrink: 0,
                              }}
                            >
                              {formatRupiah(p.harga_jual)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Table Item List */}
                  {form.items.length === 0 ? (
                    <div
                      style={{
                        padding: "18px 12px",
                        textAlign: "center",
                        borderRadius: "6px",
                        border: "1px dashed #cbd5e1",
                        backgroundColor: "#f8fafc",
                        color: "#94a3b8",
                      }}
                    >
                      <Package
                        size={22}
                        color="#94a3b8"
                        style={{ margin: "0 auto 4px auto", display: "block" }}
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#64748b",
                        }}
                      >
                        Belum ada produk yang ditambahkan
                      </span>
                      <div style={{ fontSize: "10px", marginTop: "2px" }}>
                        Gunakan kotak pencarian di atas untuk memasukkan barang
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        overflow: "hidden",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "11.5px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              backgroundColor: "#f8fafc",
                              color: "#334155",
                              fontSize: "10px",
                              fontWeight: "800",
                              textTransform: "uppercase",
                            }}
                          >
                            <th
                              style={{
                                padding: "6px 8px",
                                textAlign: "left",
                                borderBottom: "1px solid #cbd5e1",
                              }}
                            >
                              PRODUK
                            </th>
                            <th
                              style={{
                                padding: "6px 6px",
                                textAlign: "center",
                                width: "50px",
                                borderBottom: "1px solid #cbd5e1",
                              }}
                            >
                              QTY
                            </th>
                            <th
                              style={{
                                padding: "6px 8px",
                                textAlign: "right",
                                width: "85px",
                                borderBottom: "1px solid #cbd5e1",
                              }}
                            >
                              HARGA
                            </th>
                            <th
                              style={{
                                padding: "6px 8px",
                                textAlign: "right",
                                width: "85px",
                                borderBottom: "1px solid #cbd5e1",
                              }}
                            >
                              SUBTOTAL
                            </th>
                            <th
                              style={{
                                padding: "6px 4px",
                                textAlign: "center",
                                width: "28px",
                                borderBottom: "1px solid #cbd5e1",
                              }}
                            ></th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.items.map((it, idx) => (
                            <tr
                              key={idx}
                              style={{
                                borderBottom:
                                  idx < form.items.length - 1
                                    ? "1px solid #f1f5f9"
                                    : "none",
                              }}
                            >
                              <td style={{ padding: "6px 8px" }}>
                                <div
                                  style={{
                                    fontWeight: "700",
                                    color: "#0284c7",
                                    fontFamily: "monospace",
                                    fontSize: "11px",
                                  }}
                                >
                                  {it.sku || "-"}
                                </div>
                                <div
                                  style={{
                                    fontSize: "10.5px",
                                    color: "#475569",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: "180px",
                                  }}
                                >
                                  {it.nama_produk}
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: "6px 4px",
                                  textAlign: "center",
                                }}
                              >
                                <RupiahInput
                                  value={it.qty}
                                  min={1}
                                  onChange={(val) =>
                                    updateItem(idx, "qty", val || 1)
                                  }
                                  placeholder="1"
                                  style={{
                                    width: "48px",
                                    textAlign: "center",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    padding: "3px 2px",
                                    fontSize: "11.5px",
                                    fontWeight: "700",
                                    color: "#0f172a",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: "6px 6px",
                                  textAlign: "right",
                                }}
                              >
                                <RupiahInput
                                  value={it.harga_satuan}
                                  onChange={(val) =>
                                    updateItem(idx, "harga_satuan", val)
                                  }
                                  placeholder="0"
                                  style={{
                                    width: "88px",
                                    textAlign: "right",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    padding: "3px 5px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    color: "#0f172a",
                                    backgroundColor: "#ffffff",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "right",
                                  fontWeight: "800",
                                  color: "#0f172a",
                                }}
                              >
                                {formatRupiah(it.harga_satuan * it.qty)}
                              </td>
                              <td
                                style={{
                                  padding: "6px 4px",
                                  textAlign: "center",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => removeItem(idx)}
                                  title="Hapus baris"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#ef4444",
                                    padding: "2px",
                                    borderRadius: "4px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. METODE & STATUS PEMBAYARAN */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "10px 12px",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "8px",
                      paddingBottom: "5px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <CreditCard size={13} color="#0284c7" />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        color: "#0f172a",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      5. Jenis Transaksi & Diskon
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#334155",
                          marginBottom: "3px",
                        }}
                      >
                        Jenis Transaksi{" "}
                        <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <SearchableSelect
                        value={form.jenis_transaksi || "tunai"}
                        onChange={(val) =>
                          setForm({
                            ...form,
                            jenis_transaksi: val || "tunai",
                          })
                        }
                        options={[
                          {
                            value: "tunai",
                            label: "Tunai",
                            color: "#0284c7",
                          },
                          {
                            value: "kredit",
                            label: "Kredit",
                            color: "#d97706",
                          },
                        ]}
                        placeholder="Pilih Jenis Transaksi..."
                        size="sm"
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#334155",
                          marginBottom: "3px",
                        }}
                      >
                        Potongan Diskon (Rp)
                      </label>
                      <RupiahInput
                        value={form.diskon}
                        onChange={(val) =>
                          setForm({ ...form, diskon: val })
                        }
                        placeholder="0"
                        style={{
                          width: "100%",
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          fontSize: "11.5px",
                          fontWeight: "600",
                          color: "#0f172a",
                          backgroundColor: "#ffffff",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Grand Total Highlight Box */}
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background:
                        "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                        Subtotal {formatRupiah(subtotal)}{" "}
                        {Number(form.diskon) > 0
                          ? ` - Diskon ${formatRupiah(form.diskon)}`
                          : ""}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#38bdf8",
                          fontWeight: "700",
                          marginTop: "1px",
                        }}
                      >
                        Total Tagihan Pelanggan:
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "900",
                        color: "#4ade80",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {formatRupiah(totalHarga)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                marginTop: "10px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                <span style={{ color: "#ef4444", fontWeight: "800" }}>*</span>{" "}
                Pastikan seluruh data pesanan & pelanggan terisi benar sebelum
                disimpan
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  style={{
                    height: "28px",
                    padding: "0 14px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#64748b",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f1f5f9")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#ffffff")
                  }
                >
                  Batal
                </button>
                {(!editingOrderId || form.status_pesanan === "draft") && (
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    style={{
                      height: "28px",
                      padding: "0 14px",
                      borderRadius: "5px",
                      border: "1px solid #94a3b8",
                      backgroundColor: "#f8fafc",
                      color: "#334155",
                      fontSize: "11.5px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f1f5f9")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                  >
                    Simpan Draft
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  style={{
                    height: "28px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0 16px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(2, 132, 199, 0.35)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#0369a1")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#0284c7")
                  }
                >
                  <Save size={13} />
                  <span>
                    {editingOrderId
                      ? "Simpan Perubahan"
                      : "Konfirmasi Pesanan"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: DETAIL PESANAN (FULL SCREEN COMPACT - MASTER PRODUK STYLE)   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {detailOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            maxHeight: "100vh",
            backgroundColor: "#0f172a",
            zIndex: 2500,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header Bar Fullscreen (44px) */}
          <div
            style={{
              height: "44px",
              padding: "0 18px",
              background:
                "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)",
              borderBottom: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Eye size={14} />
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "#ffffff",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                Detail Pesanan Offline — {detailOrder.no_pesanan}
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b" }}>•</span>
              <span
                style={{
                  fontSize: "11.5px",
                  color: "#94a3b8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {detailOrder.nama_pembeli}
              </span>
              <div style={{ marginLeft: "4px" }}>
                {getStatusBadge(detailOrder.status_pesanan)}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => handleOpenPaymentModal(detailOrder)}
                style={{
                  height: "28px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "0 12px",
                  borderRadius: "5px",
                  border: "1px solid #10b981",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(16, 185, 129, 0.28)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(16, 185, 129, 0.15)";
                }}
              >
                <DollarSign size={12} />
                <span>
                  {detailOrder.status_pembayaran === "lunas"
                    ? "Riwayat Bayar"
                    : "Bayar / Cicilan"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const id = detailOrder.id;
                  setDetailOrder(null);
                  handleEditOrder(id);
                }}
                style={{
                  height: "28px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "0 12px",
                  borderRadius: "5px",
                  border: "1px solid #38bdf8",
                  backgroundColor: "rgba(56, 189, 248, 0.1)",
                  color: "#38bdf8",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(56, 189, 248, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(56, 189, 248, 0.1)";
                }}
              >
                <Edit3 size={12} />
                <span>Edit Pesanan</span>
              </button>

              <button
                type="button"
                onClick={() => handleDelete(detailOrder)}
                style={{
                  height: "28px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "0 12px",
                  borderRadius: "5px",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  color: "#f87171",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(239, 68, 68, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(239, 68, 68, 0.12)";
                }}
              >
                <Trash2 size={12} />
                <span>Hapus</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "5px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(239, 68, 68, 0.2)";
                  e.currentTarget.style.color = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.color = "#cbd5e1";
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Fullscreen Body (2-Column Layout Identical to Edit Modal & Data Produk) */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px",
              backgroundColor: "#f1f5f9",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
                gap: "10px",
                alignItems: "start",
              }}
            >
              {/* LEFT COLUMN: INFO TRANSAKSI, IDENTITAS PELANGGAN, PENGIRIMAN & CATATAN */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* 1. Info Transaksi & Toko */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "10px 12px",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      paddingBottom: "5px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Calendar size={13} color="#0284c7" />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: "#0f172a",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        1. Info Transaksi & Toko
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "800",
                        padding: "1px 8px",
                        borderRadius: "4px",
                        backgroundColor: "#e0f2fe",
                        color: "#0369a1",
                        border: "1px solid #bae6fd",
                      }}
                    >
                      {detailOrder.kode_perusahaan ||
                        activeCompany?.code ||
                        "RSG"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#64748b",
                          marginBottom: "2px",
                        }}
                      >
                        Nomor Pesanan
                      </span>
                      <div
                        style={{
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #bae6fd",
                          backgroundColor: "#f0f9ff",
                          fontSize: "12px",
                          fontFamily: "monospace",
                          fontWeight: "800",
                          color: "#0284c7",
                        }}
                      >
                        {detailOrder.no_pesanan}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#64748b",
                          marginBottom: "2px",
                        }}
                      >
                        Tanggal Pesanan
                      </span>
                      <div
                        style={{
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          fontSize: "11.5px",
                          fontWeight: "700",
                          color: "#0f172a",
                        }}
                      >
                        {detailOrder.dibuat_pada
                          ? new Date(
                              detailOrder.dibuat_pada,
                            ).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })
                          : "-"}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#64748b",
                          marginBottom: "2px",
                        }}
                      >
                        Toko / Instansi Asal
                      </span>
                      <div
                        style={{
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          fontSize: "11.5px",
                          fontWeight: "700",
                          color: "#0f172a",
                        }}
                      >
                        {detailOrder.nama_toko || "-"}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#64748b",
                          marginBottom: "2px",
                        }}
                      >
                        Status Pesanan & SPK
                      </span>
                      <div
                        style={{
                          padding: "5px 9px",
                          borderRadius: "5px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "6px",
                        }}
                      >
                        {getStatusBadge(detailOrder.status_pesanan)}
                        {detailOrder.no_spk && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "800",
                              color: "#7c3aed",
                              backgroundColor: "#f5f3ff",
                              border: "1px solid #ddd6fe",
                              padding: "1px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            SPK: {detailOrder.no_spk}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Identitas Pelanggan & Alamat */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #38bdf8",
                    padding: "10px 12px",
                    boxShadow: "0 1px 3px rgba(2, 132, 199, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      paddingBottom: "5px",
                      borderBottom: "1px solid #e0f2fe",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Users size={13} color="#0284c7" />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: "#0369a1",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        2. Identitas Pelanggan & Alamat
                      </span>
                    </div>

                    {detailOrder.is_dropship === 1 && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "1px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#f5f3ff",
                          color: "#7c3aed",
                          border: "1px solid #ddd6fe",
                        }}
                      >
                        Dropshipper Aktif
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            display: "block",
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#64748b",
                            marginBottom: "2px",
                          }}
                        >
                          Nama Pelanggan
                        </span>
                        <div
                          style={{
                            padding: "6px 9px",
                            borderRadius: "5px",
                            border: "1px solid #e2e8f0",
                            backgroundColor: "#f8fafc",
                            fontSize: "12px",
                            fontWeight: "800",
                            color: "#0f172a",
                          }}
                        >
                          {detailOrder.nama_pembeli || "-"}
                        </div>
                      </div>

                      <div>
                        <span
                          style={{
                            display: "block",
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#64748b",
                            marginBottom: "2px",
                          }}
                        >
                          No Telepon / WhatsApp
                        </span>
                        <div
                          style={{
                            padding: "6px 9px",
                            borderRadius: "5px",
                            border: "1px solid #e2e8f0",
                            backgroundColor: "#f8fafc",
                            fontSize: "12px",
                            fontWeight: "700",
                            color: "#0f172a",
                          }}
                        >
                          {detailOrder.no_telepon || "-"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#64748b",
                          marginBottom: "2px",
                        }}
                      >
                        Alamat Lengkap Pengiriman
                      </span>
                      <div
                        style={{
                          padding: "7px 9px",
                          borderRadius: "5px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          fontSize: "11.5px",
                          fontWeight: "600",
                          color: "#334155",
                          minHeight: "38px",
                          lineHeight: 1.4,
                        }}
                      >
                        {detailOrder.alamat_pengiriman || "-"}
                        {(detailOrder.kota ||
                          detailOrder.provinsi ||
                          detailOrder.kode_pos) && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#64748b",
                              marginTop: "2px",
                            }}
                          >
                            {[
                              detailOrder.kota,
                              detailOrder.provinsi,
                              detailOrder.kode_pos,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    </div>

                    {detailOrder.is_dropship === 1 && (
                      <div
                        style={{
                          padding: "8px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#f5f3ff",
                          border: "1px solid #ddd6fe",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              display: "block",
                              fontSize: "10px",
                              fontWeight: "700",
                              color: "#6d28d9",
                              marginBottom: "2px",
                            }}
                          >
                            Nama Pengirim Dropship
                          </span>
                          <div
                            style={{
                              fontSize: "11.5px",
                              fontWeight: "800",
                              color: "#4c1d95",
                            }}
                          >
                            {detailOrder.nama_pengirim_ds || "-"}
                          </div>
                        </div>
                        <div>
                          <span
                            style={{
                              display: "block",
                              fontSize: "10px",
                              fontWeight: "700",
                              color: "#6d28d9",
                              marginBottom: "2px",
                            }}
                          >
                            No. Telepon Pengirim Dropship
                          </span>
                          <div
                            style={{
                              fontSize: "11.5px",
                              fontWeight: "700",
                              color: "#4c1d95",
                            }}
                          >
                            {detailOrder.no_telp_pengirim_ds || "-"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Ekspedisi Pengiriman & Catatan Khusus */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "10px 12px",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "8px",
                      paddingBottom: "5px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <Truck size={13} color="#0284c7" />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        color: "#0f172a",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      3. Pengiriman & Catatan Khusus Pesanan
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#64748b",
                          marginBottom: "2px",
                        }}
                      >
                        Ekspedisi / Kurir
                      </span>
                      <div
                        style={{
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          fontSize: "11.5px",
                          fontWeight: "700",
                          color: "#0f172a",
                        }}
                      >
                        {[detailOrder.kurir, detailOrder.jenis_layanan]
                          .filter(Boolean)
                          .join(" — ") || "-"}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#64748b",
                          marginBottom: "2px",
                        }}
                      >
                        Nomor Resi Pengiriman
                      </span>
                      <div
                        style={{
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: detailOrder.no_resi
                            ? "#f0f9ff"
                            : "#f8fafc",
                          fontSize: "11.5px",
                          fontFamily: detailOrder.no_resi
                            ? "monospace"
                            : "inherit",
                          fontWeight: "800",
                          color: detailOrder.no_resi ? "#0284c7" : "#94a3b8",
                        }}
                      >
                        {detailOrder.no_resi || "Belum ada resi"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "10.5px",
                        fontWeight: "700",
                        color: "#64748b",
                        marginBottom: "2px",
                      }}
                    >
                      Catatan Khusus Pesanan
                    </span>
                    <div
                      style={{
                        padding: "7px 9px",
                        borderRadius: "5px",
                        border: detailOrder.catatan
                          ? "1px solid #fde68a"
                          : "1px solid #e2e8f0",
                        backgroundColor: detailOrder.catatan
                          ? "#fffbeb"
                          : "#f8fafc",
                        fontSize: "11.5px",
                        fontWeight: "600",
                        color: detailOrder.catatan ? "#92400e" : "#94a3b8",
                        minHeight: "34px",
                      }}
                    >
                      {detailOrder.catatan || "Tidak ada catatan khusus"}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: DAFTAR PRODUK PESANAN & METODE PEMBAYARAN */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* 4. Daftar Produk Pesanan */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "10px 12px",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      paddingBottom: "5px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Package size={13} color="#0284c7" />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: "#0f172a",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        4. Daftar Produk Pesanan
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#f0f9ff",
                          color: "#0284c7",
                          border: "1px solid #bae6fd",
                        }}
                      >
                        {detailOrder.items?.length || 0} Macam Item ·{" "}
                        {(detailOrder.items || []).reduce(
                          (s, it) => s + Number(it.qty || 0),
                          0,
                        )}{" "}
                        Pcs
                      </span>
                    </div>
                  </div>

                  {detailOrder.items && detailOrder.items.length > 0 ? (
                    <div
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        overflow: "hidden",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "11.5px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              backgroundColor: "#f8fafc",
                              color: "#475569",
                              fontSize: "10px",
                              fontWeight: "800",
                              textTransform: "uppercase",
                            }}
                          >
                            <th
                              style={{
                                padding: "6px 8px",
                                borderBottom: "1px solid #cbd5e1",
                                borderRight: "1px solid #cbd5e1",
                                textAlign: "center",
                                width: "36px",
                              }}
                            >
                              NO
                            </th>
                            <th
                              style={{
                                padding: "6px 8px",
                                borderBottom: "1px solid #cbd5e1",
                                borderRight: "1px solid #cbd5e1",
                                textAlign: "left",
                              }}
                            >
                              SKU & NAMA PRODUK
                            </th>
                            <th
                              style={{
                                padding: "6px 8px",
                                borderBottom: "1px solid #cbd5e1",
                                borderRight: "1px solid #cbd5e1",
                                textAlign: "center",
                                width: "65px",
                              }}
                            >
                              QTY
                            </th>
                            <th
                              style={{
                                padding: "6px 8px",
                                borderBottom: "1px solid #cbd5e1",
                                borderRight: "1px solid #cbd5e1",
                                textAlign: "right",
                                width: "110px",
                              }}
                            >
                              HARGA
                            </th>
                            <th
                              style={{
                                padding: "6px 8px",
                                borderBottom: "1px solid #cbd5e1",
                                textAlign: "right",
                                width: "120px",
                              }}
                            >
                              SUBTOTAL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailOrder.items.map((it, i) => (
                            <tr
                              key={i}
                              style={{
                                borderBottom:
                                  i < detailOrder.items.length - 1
                                    ? "1px solid #e2e8f0"
                                    : "none",
                              }}
                            >
                              <td
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "center",
                                  color: "#64748b",
                                  fontWeight: "700",
                                  borderRight: "1px solid #e2e8f0",
                                }}
                              >
                                {i + 1}
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  borderRight: "1px solid #e2e8f0",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: "800",
                                    color: "#0284c7",
                                    fontSize: "11px",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {it.sku || "-"}
                                </div>
                                <div
                                  style={{
                                    fontSize: "11.5px",
                                    fontWeight: "700",
                                    color: "#0f172a",
                                  }}
                                >
                                  {it.nama_produk}
                                  {it.varian ? ` (${it.varian})` : ""}
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "center",
                                  fontWeight: "800",
                                  color: "#0f172a",
                                  borderRight: "1px solid #e2e8f0",
                                }}
                              >
                                {Number(it.qty || 0).toLocaleString("id-ID")}
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "right",
                                  color: "#475569",
                                  fontWeight: "700",
                                  borderRight: "1px solid #e2e8f0",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatRupiah(it.harga_satuan)}
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "right",
                                  fontWeight: "800",
                                  color: "#0f172a",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatRupiah(it.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "11.5px",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "6px",
                      }}
                    >
                      Tidak ada item produk pada pesanan ini
                    </div>
                  )}
                </div>

                {/* 5. Metode & Status Pembayaran */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #38bdf8",
                    padding: "10px 12px",
                    boxShadow: "0 1px 3px rgba(2, 132, 199, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      paddingBottom: "5px",
                      borderBottom: "1px solid #e0f2fe",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CreditCard size={13} color="#0284c7" />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: "#0369a1",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        5. Jenis Transaksi, Diskon & Pembayaran
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "800",
                        padding: "1px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          detailOrder.status_pembayaran === "lunas"
                            ? "#ecfdf5"
                            : detailOrder.status_pembayaran === "dp"
                              ? "#fffbeb"
                              : "#fef2f2",
                        color:
                          detailOrder.status_pembayaran === "lunas"
                            ? "#059669"
                            : detailOrder.status_pembayaran === "dp"
                              ? "#d97706"
                              : "#dc2626",
                        border:
                          detailOrder.status_pembayaran === "lunas"
                            ? "1px solid #a7f3d0"
                            : detailOrder.status_pembayaran === "dp"
                              ? "1px solid #fde68a"
                              : "1px solid #fecaca",
                      }}
                    >
                      {detailOrder.status_pembayaran === "lunas"
                        ? "LUNAS"
                        : detailOrder.status_pembayaran === "dp"
                          ? "DICICIL / DP"
                          : "BELUM BAYAR"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#64748b",
                          marginBottom: "2px",
                        }}
                      >
                        Jenis Transaksi
                      </span>
                      <div
                        style={{
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#f8fafc",
                          fontSize: "12px",
                          fontWeight: "800",
                          color:
                            detailOrder.jenis_transaksi === "kredit"
                              ? "#b45309"
                              : "#0284c7",
                        }}
                      >
                        {detailOrder.jenis_transaksi === "kredit"
                          ? "Kredit"
                          : "Tunai"}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#64748b",
                          marginBottom: "2px",
                        }}
                      >
                        Potongan Diskon (Rp)
                      </span>
                      <div
                        style={{
                          padding: "6px 9px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#f8fafc",
                          fontSize: "12px",
                          fontWeight: "700",
                          color:
                            Number(detailOrder.diskon) > 0
                              ? "#ef4444"
                              : "#475569",
                          textAlign: "right",
                        }}
                      >
                        {formatRupiah(detailOrder.diskon || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Ringkasan Sudah Dibayar & Sisa Tagihan */}
                  {(() => {
                    const sudahBayar =
                      detailOrder.status_pembayaran === "lunas"
                        ? Number(detailOrder.total_harga || 0)
                        : Number(detailOrder.nominal_dp || 0);
                    const sisaTagihan = Math.max(
                      0,
                      Number(detailOrder.total_harga || 0) - sudahBayar,
                    );
                    const listBayar = Array.isArray(detailOrder.pembayaran_list)
                      ? detailOrder.pembayaran_list
                      : [];

                    return (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px",
                            marginBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              padding: "7px 10px",
                              borderRadius: "6px",
                              backgroundColor: "#ecfdf5",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            <span
                              style={{
                                display: "block",
                                fontSize: "10px",
                                fontWeight: "700",
                                color: "#047857",
                              }}
                            >
                              Total Sudah Dibayar / Dicicil
                            </span>
                            <div
                              style={{
                                fontSize: "13.5px",
                                fontWeight: "900",
                                color: "#059669",
                                marginTop: "1px",
                              }}
                            >
                              {formatRupiah(sudahBayar)}
                            </div>
                          </div>

                          <div
                            style={{
                              padding: "7px 10px",
                              borderRadius: "6px",
                              backgroundColor:
                                sisaTagihan > 0 ? "#fef2f2" : "#f0fdf4",
                              border:
                                sisaTagihan > 0
                                  ? "1px solid #fecaca"
                                  : "1px solid #bbf7d0",
                            }}
                          >
                            <span
                              style={{
                                display: "block",
                                fontSize: "10px",
                                fontWeight: "700",
                                color: sisaTagihan > 0 ? "#b91c1c" : "#15803d",
                              }}
                            >
                              Sisa Tagihan Belum Dibayar
                            </span>
                            <div
                              style={{
                                fontSize: "13.5px",
                                fontWeight: "900",
                                color: sisaTagihan > 0 ? "#dc2626" : "#16a34a",
                                marginTop: "1px",
                              }}
                            >
                              {sisaTagihan > 0
                                ? formatRupiah(sisaTagihan)
                                : "Rp 0 (Lunas)"}
                            </div>
                          </div>
                        </div>

                        {/* Tabel Riwayat Cicilan / Pembayaran */}
                        <div style={{ marginBottom: "8px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "5px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: "800",
                                color: "#334155",
                                textTransform: "uppercase",
                              }}
                            >
                              Riwayat Pembayaran & Cicilan ({listBayar.length}x)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(detailOrder)}
                              style={{
                                height: "24px",
                                padding: "0 10px",
                                borderRadius: "5px",
                                border: "none",
                                backgroundColor: "#059669",
                                color: "#ffffff",
                                fontSize: "10.5px",
                                fontWeight: "800",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                boxShadow:
                                  "0 1px 3px rgba(5, 150, 105, 0.3)",
                              }}
                            >
                              <Plus size={12} />
                              <span>
                                {sisaTagihan > 0
                                  ? "Tambah Bayar / Cicilan"
                                  : "Kelola Pembayaran"}
                              </span>
                            </button>
                          </div>

                          {listBayar.length > 0 ? (
                            <div
                              style={{
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                overflow: "hidden",
                              }}
                            >
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: "11px",
                                }}
                              >
                                <thead>
                                  <tr
                                    style={{
                                      backgroundColor: "#f8fafc",
                                      color: "#475569",
                                      fontSize: "9.5px",
                                      fontWeight: "800",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    <th
                                      style={{
                                        padding: "5px 6px",
                                        borderBottom: "1px solid #cbd5e1",
                                        borderRight: "1px solid #cbd5e1",
                                        textAlign: "center",
                                        width: "40px",
                                      }}
                                    >
                                      KE
                                    </th>
                                    <th
                                      style={{
                                        padding: "5px 6px",
                                        borderBottom: "1px solid #cbd5e1",
                                        borderRight: "1px solid #cbd5e1",
                                        textAlign: "left",
                                      }}
                                    >
                                      TANGGAL
                                    </th>
                                    <th
                                      style={{
                                        padding: "5px 6px",
                                        borderBottom: "1px solid #cbd5e1",
                                        borderRight: "1px solid #cbd5e1",
                                        textAlign: "left",
                                      }}
                                    >
                                      METODE & KETERANGAN
                                    </th>
                                    <th
                                      style={{
                                        padding: "5px 6px",
                                        borderBottom: "1px solid #cbd5e1",
                                        borderRight: "1px solid #cbd5e1",
                                        textAlign: "right",
                                      }}
                                    >
                                      NOMINAL
                                    </th>
                                    <th
                                      style={{
                                        padding: "5px 6px",
                                        borderBottom: "1px solid #cbd5e1",
                                        textAlign: "center",
                                        width: "40px",
                                      }}
                                    >
                                      AKSI
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {listBayar.map((p, idx) => (
                                    <tr
                                      key={p.id || idx}
                                      style={{
                                        borderBottom:
                                          idx < listBayar.length - 1
                                            ? "1px solid #e2e8f0"
                                            : "none",
                                      }}
                                    >
                                      <td
                                        style={{
                                          padding: "5px 6px",
                                          textAlign: "center",
                                          fontWeight: "800",
                                          color: "#0284c7",
                                          borderRight: "1px solid #e2e8f0",
                                        }}
                                      >
                                        #{idx + 1}
                                      </td>
                                      <td
                                        style={{
                                          padding: "5px 6px",
                                          color: "#334155",
                                          fontWeight: "600",
                                          borderRight: "1px solid #e2e8f0",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {p.tanggal_bayar
                                          ? new Date(
                                              p.tanggal_bayar,
                                            ).toLocaleDateString("id-ID", {
                                              day: "2-digit",
                                              month: "short",
                                              year: "numeric",
                                            })
                                          : "-"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "5px 6px",
                                          borderRight: "1px solid #e2e8f0",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontWeight: "800",
                                            color:
                                              p.metode_pembayaran === "transfer"
                                                ? "#0284c7"
                                                : "#0f766e",
                                          }}
                                        >
                                          {p.metode_pembayaran === "transfer"
                                            ? p.bank_tujuan
                                              ? `Transfer (${p.bank_tujuan})`
                                              : "Transfer"
                                            : "Cash"}
                                        </span>
                                        {p.keterangan ? (
                                          <span
                                            style={{
                                              color: "#64748b",
                                              marginLeft: "4px",
                                            }}
                                          >
                                            — {p.keterangan}
                                          </span>
                                        ) : null}
                                      </td>
                                      <td
                                        style={{
                                          padding: "5px 6px",
                                          textAlign: "right",
                                          fontWeight: "800",
                                          color: "#059669",
                                          borderRight: "1px solid #e2e8f0",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {formatRupiah(p.nominal)}
                                      </td>
                                      <td
                                        style={{
                                          padding: "5px 6px",
                                          textAlign: "center",
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeletePayment(
                                              detailOrder.id,
                                              p.id,
                                            )
                                          }
                                          title="Hapus Cicilan Ini"
                                          style={{
                                            width: "22px",
                                            height: "22px",
                                            borderRadius: "4px",
                                            border: "none",
                                            backgroundColor: "#fee2e2",
                                            color: "#ef4444",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div
                              style={{
                                padding: "10px",
                                textAlign: "center",
                                fontSize: "11px",
                                color: "#94a3b8",
                                backgroundColor: "#f8fafc",
                                borderRadius: "6px",
                                border: "1px dashed #cbd5e1",
                              }}
                            >
                              Belum ada pembayaran tercatat. Klik{" "}
                              <strong>+ Tambah Bayar / Cicilan</strong> untuk
                              mencatat pembayaran.
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {/* Dark Navy Total Banner (Matching Form Pesanan) */}
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background:
                        "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                        Subtotal {formatRupiah(detailOrder.subtotal)}{" "}
                        {Number(detailOrder.diskon) > 0
                          ? ` - Diskon ${formatRupiah(detailOrder.diskon)}`
                          : ""}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#38bdf8",
                          fontWeight: "700",
                          marginTop: "1px",
                        }}
                      >
                        Total Tagihan Pelanggan:
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "900",
                        color: "#4ade80",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {formatRupiah(detailOrder.total_harga)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                marginTop: "10px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Menampilkan rincian transaksi{" "}
                <strong style={{ color: "#0f172a" }}>
                  {detailOrder.no_pesanan}
                </strong>{" "}
                — Pelanggan:{" "}
                <strong style={{ color: "#0f172a" }}>
                  {detailOrder.nama_pembeli}
                </strong>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleOpenSpkModal(detailOrder)}
                  style={{
                    height: "28px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0 14px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#7c3aed",
                    color: "#ffffff",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(124, 58, 237, 0.35)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <ClipboardList size={13} />
                  <span>
                    {detailOrder.no_spk
                      ? `Update SPK (${detailOrder.no_spk})`
                      : "Input ke SPK"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPaymentModal(detailOrder)}
                  style={{
                    height: "28px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0 14px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(5, 150, 105, 0.35)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <DollarSign size={13} />
                  <span>Input Bayar / Cicilan</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(detailOrder)}
                  style={{
                    height: "28px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0 14px",
                    borderRadius: "5px",
                    border: "1px solid #fecaca",
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Trash2 size={13} />
                  <span>Hapus Pesanan</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = detailOrder.id;
                    setDetailOrder(null);
                    handleEditOrder(id);
                  }}
                  style={{
                    height: "28px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0 14px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(2, 132, 199, 0.35)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Edit3 size={13} />
                  <span>Edit Pesanan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailOrder(null)}
                  style={{
                    height: "28px",
                    padding: "0 16px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#334155",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: INPUT PEMBAYARAN / CICILAN PESANAN OFFLINE ────────────────── */}
      {paymentModalOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(3px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "640px",
              maxWidth: "96vw",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                padding: "12px 18px",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                  }}
                >
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: "800",
                      color: "#ffffff",
                    }}
                  >
                    Pembayaran & Cicilan — {paymentModalOrder.no_pesanan}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      color: "rgba(255, 255, 255, 0.88)",
                    }}
                  >
                    Pelanggan: <strong>{paymentModalOrder.nama_pembeli}</strong>{" "}
                    {paymentModalOrder.nama_toko
                      ? `(${paymentModalOrder.nama_toko})`
                      : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            {(() => {
              const totalTagihan = Number(paymentModalOrder.total_harga || 0);
              const sudahBayar =
                paymentModalOrder.status_pembayaran === "lunas"
                  ? totalTagihan
                  : Number(paymentModalOrder.nominal_dp || 0);
              const sisaTagihan = Math.max(0, totalTagihan - sudahBayar);
              const listBayar = Array.isArray(
                paymentModalOrder.pembayaran_list,
              )
                ? paymentModalOrder.pembayaran_list
                : [];

              return (
                <div
                  style={{
                    padding: "14px 18px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {/* 3 Kartu Ringkasan Tagihan */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "10px",
                          fontWeight: "700",
                          color: "#64748b",
                        }}
                      >
                        TOTAL TAGIHAN
                      </span>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "900",
                          color: "#0f172a",
                          marginTop: "2px",
                        }}
                      >
                        {formatRupiah(totalTagihan)}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "10px",
                          fontWeight: "700",
                          color: "#047857",
                        }}
                      >
                        SUDAH DIBAYAR ({listBayar.length}x)
                      </span>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "900",
                          color: "#059669",
                          marginTop: "2px",
                        }}
                      >
                        {formatRupiah(sudahBayar)}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        backgroundColor:
                          sisaTagihan > 0 ? "#fef2f2" : "#f0fdf4",
                        border:
                          sisaTagihan > 0
                            ? "1px solid #fecaca"
                            : "1px solid #bbf7d0",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "10px",
                          fontWeight: "700",
                          color: sisaTagihan > 0 ? "#b91c1c" : "#15803d",
                        }}
                      >
                        SISA TAGIHAN
                      </span>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "900",
                          color: sisaTagihan > 0 ? "#dc2626" : "#16a34a",
                          marginTop: "2px",
                        }}
                      >
                        {sisaTagihan > 0
                          ? formatRupiah(sisaTagihan)
                          : "LUNAS ✓"}
                      </div>
                    </div>
                  </div>

                  {/* Riwayat Cicilan */}
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        color: "#0f172a",
                        textTransform: "uppercase",
                        marginBottom: "6px",
                      }}
                    >
                      Riwayat Cicilan & Pembayaran ({listBayar.length})
                    </div>
                    {listBayar.length > 0 ? (
                      <div
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          overflow: "hidden",
                          maxHeight: "160px",
                          overflowY: "auto",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "11.5px",
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                backgroundColor: "#f8fafc",
                                color: "#475569",
                                fontSize: "10px",
                                fontWeight: "800",
                                textTransform: "uppercase",
                              }}
                            >
                              <th
                                style={{
                                  padding: "5px 8px",
                                  borderBottom: "1px solid #cbd5e1",
                                  borderRight: "1px solid #cbd5e1",
                                  textAlign: "center",
                                  width: "40px",
                                }}
                              >
                                KE
                              </th>
                              <th
                                style={{
                                  padding: "5px 8px",
                                  borderBottom: "1px solid #cbd5e1",
                                  borderRight: "1px solid #cbd5e1",
                                  textAlign: "left",
                                }}
                              >
                                TANGGAL
                              </th>
                              <th
                                style={{
                                  padding: "5px 8px",
                                  borderBottom: "1px solid #cbd5e1",
                                  borderRight: "1px solid #cbd5e1",
                                  textAlign: "left",
                                }}
                              >
                                METODE / KETERANGAN
                              </th>
                              <th
                                style={{
                                  padding: "5px 8px",
                                  borderBottom: "1px solid #cbd5e1",
                                  borderRight: "1px solid #cbd5e1",
                                  textAlign: "right",
                                }}
                              >
                                NOMINAL
                              </th>
                              <th
                                style={{
                                  padding: "5px 8px",
                                  borderBottom: "1px solid #cbd5e1",
                                  textAlign: "center",
                                  width: "45px",
                                }}
                              >
                                HAPUS
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {listBayar.map((p, idx) => (
                              <tr
                                key={p.id || idx}
                                style={{
                                  borderBottom:
                                    idx < listBayar.length - 1
                                      ? "1px solid #e2e8f0"
                                      : "none",
                                }}
                              >
                                <td
                                  style={{
                                    padding: "5px 8px",
                                    textAlign: "center",
                                    fontWeight: "800",
                                    color: "#0284c7",
                                    borderRight: "1px solid #e2e8f0",
                                  }}
                                >
                                  #{idx + 1}
                                </td>
                                <td
                                  style={{
                                    padding: "5px 8px",
                                    color: "#334155",
                                    fontWeight: "600",
                                    borderRight: "1px solid #e2e8f0",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {p.tanggal_bayar
                                    ? new Date(
                                        p.tanggal_bayar,
                                      ).toLocaleDateString("id-ID", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "-"}
                                </td>
                                <td
                                  style={{
                                    padding: "5px 8px",
                                    borderRight: "1px solid #e2e8f0",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: "800",
                                      color:
                                        p.metode_pembayaran === "transfer"
                                          ? "#0284c7"
                                          : "#0f766e",
                                    }}
                                  >
                                    {p.metode_pembayaran === "transfer"
                                      ? p.bank_tujuan
                                        ? `Transfer (${p.bank_tujuan})`
                                        : "Transfer"
                                      : "Cash"}
                                  </span>
                                  {p.keterangan ? (
                                    <span
                                      style={{
                                        color: "#64748b",
                                        marginLeft: "4px",
                                      }}
                                    >
                                      — {p.keterangan}
                                    </span>
                                  ) : null}
                                </td>
                                <td
                                  style={{
                                    padding: "5px 8px",
                                    textAlign: "right",
                                    fontWeight: "800",
                                    color: "#059669",
                                    borderRight: "1px solid #e2e8f0",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatRupiah(p.nominal)}
                                </td>
                                <td
                                  style={{
                                    padding: "5px 8px",
                                    textAlign: "center",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeletePayment(
                                        paymentModalOrder.id,
                                        p.id,
                                      )
                                    }
                                    title="Hapus Cicilan Ini"
                                    style={{
                                      width: "22px",
                                      height: "22px",
                                      borderRadius: "4px",
                                      border: "none",
                                      backgroundColor: "#fee2e2",
                                      color: "#ef4444",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          fontSize: "11.5px",
                          color: "#94a3b8",
                          backgroundColor: "#f8fafc",
                          borderRadius: "6px",
                          border: "1px dashed #cbd5e1",
                        }}
                      >
                        Belum ada cicilan / pembayaran yang tercatat.
                      </div>
                    )}
                  </div>

                  {/* Form Input Cicilan Baru */}
                  <form
                    onSubmit={handleSavePayment}
                    style={{
                      backgroundColor: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      borderRadius: "8px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: "800",
                          color: "#0369a1",
                          textTransform: "uppercase",
                        }}
                      >
                        + Input Pembayaran / Cicilan Baru
                      </span>
                      {sisaTagihan > 0 && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() =>
                              setPaymentForm((prev) => ({
                                ...prev,
                                nominal: Math.round(sisaTagihan / 2),
                                keterangan: `Cicilan ke-${listBayar.length + 1}`,
                              }))
                            }
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              border: "1px solid #0284c7",
                              backgroundColor: "#ffffff",
                              color: "#0284c7",
                              fontSize: "10px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            Isi 50% ({formatRupiah(Math.round(sisaTagihan / 2))}
                            )
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPaymentForm((prev) => ({
                                ...prev,
                                nominal: sisaTagihan,
                                keterangan: "Pelunasan",
                              }))
                            }
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              border: "1px solid #059669",
                              backgroundColor: "#059669",
                              color: "#ffffff",
                              fontSize: "10px",
                              fontWeight: "800",
                              cursor: "pointer",
                            }}
                          >
                            Lunasi Sisa ({formatRupiah(sisaTagihan)})
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1.2fr",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#334155",
                            marginBottom: "2px",
                          }}
                        >
                          Tanggal Bayar
                        </label>
                        <input
                          type="date"
                          value={paymentForm.tanggal_bayar}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              tanggal_bayar: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "6px 9px",
                            borderRadius: "5px",
                            border: "1px solid #cbd5e1",
                            fontSize: "11.5px",
                            fontWeight: "600",
                            backgroundColor: "#ffffff",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#059669",
                            marginBottom: "2px",
                          }}
                        >
                          Nominal Bayar / Cicilan (Rp) *
                        </label>
                        <RupiahInput
                          value={paymentForm.nominal}
                          onChange={(val) =>
                            setPaymentForm({
                              ...paymentForm,
                              nominal: val,
                            })
                          }
                          placeholder="0"
                          style={{
                            width: "100%",
                            padding: "6px 9px",
                            borderRadius: "5px",
                            border: "1px solid #10b981",
                            fontSize: "12px",
                            fontWeight: "800",
                            color: "#059669",
                            backgroundColor: "#ffffff",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          paymentForm.metode_pembayaran === "transfer"
                            ? "1fr 1.2fr"
                            : "1fr 1fr",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#334155",
                            marginBottom: "2px",
                          }}
                        >
                          Metode Pembayaran
                        </label>
                        <SearchableSelect
                          value={paymentForm.metode_pembayaran}
                          onChange={(val) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              metode_pembayaran: val,
                              bank_tujuan:
                                val === "transfer"
                                  ? prev.bank_tujuan || "BCA"
                                  : "",
                            }))
                          }
                          options={BAYAR_OPTIONS}
                          placeholder="Pilih metode..."
                          size="sm"
                        />
                      </div>

                      {paymentForm.metode_pembayaran === "transfer" ? (
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "10.5px",
                              fontWeight: "700",
                              color: "#0284c7",
                              marginBottom: "2px",
                            }}
                          >
                            Pilih Bank Tujuan Transfer *
                          </label>
                          <SearchableSelect
                            value={paymentForm.bank_tujuan || ""}
                            onChange={(val) =>
                              setPaymentForm((prev) => ({
                                ...prev,
                                bank_tujuan: val,
                              }))
                            }
                            options={
                              bankList.length > 0
                                ? bankList.map((b) => ({
                                    value: b.nama_bank,
                                    label: b.no_rekening
                                      ? `${b.nama_bank} — ${b.no_rekening}${b.atas_nama ? ` (${b.atas_nama})` : ""}`
                                      : b.nama_bank,
                                  }))
                                : BANK_OPTIONS
                            }
                            placeholder="-- Pilih Bank --"
                            size="sm"
                          />
                        </div>
                      ) : (
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "10.5px",
                              fontWeight: "700",
                              color: "#334155",
                              marginBottom: "2px",
                            }}
                          >
                            Keterangan Pembayaran
                          </label>
                          <input
                            type="text"
                            value={paymentForm.keterangan}
                            onChange={(e) =>
                              setPaymentForm({
                                ...paymentForm,
                                keterangan: e.target.value,
                              })
                            }
                            placeholder="Contoh: Cicilan ke-1, DP, Pelunasan..."
                            style={{
                              width: "100%",
                              padding: "6px 9px",
                              borderRadius: "5px",
                              border: "1px solid #cbd5e1",
                              fontSize: "11.5px",
                              backgroundColor: "#ffffff",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {paymentForm.metode_pembayaran === "transfer" && (
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#334155",
                            marginBottom: "2px",
                          }}
                        >
                          Keterangan Pembayaran
                        </label>
                        <input
                          type="text"
                          value={paymentForm.keterangan}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              keterangan: e.target.value,
                            })
                          }
                          placeholder="Contoh: Cicilan ke-1, DP, Pelunasan..."
                          style={{
                            width: "100%",
                            padding: "6px 9px",
                            borderRadius: "5px",
                            border: "1px solid #cbd5e1",
                            fontSize: "11.5px",
                            backgroundColor: "#ffffff",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px",
                        marginTop: "2px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setPaymentModalOrder(null)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#ffffff",
                          color: "#64748b",
                          fontSize: "11.5px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        Tutup
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingPayment}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "6px 16px",
                          borderRadius: "5px",
                          border: "none",
                          backgroundColor: "#059669",
                          color: "#ffffff",
                          fontSize: "11.5px",
                          fontWeight: "800",
                          cursor: isSavingPayment ? "not-allowed" : "pointer",
                          boxShadow: "0 2px 4px rgba(5, 150, 105, 0.35)",
                        }}
                      >
                        <Save size={13} />
                        <span>
                          {isSavingPayment
                            ? "Menyimpan..."
                            : "Simpan Pembayaran"}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── MODAL: TAMBAH / EDIT MASTER PELANGGAN ─────────────────────────────── */}
      {isPelangganModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(3px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "540px",
              maxWidth: "95vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 18px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "7px",
                    backgroundColor: "#e0f2fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0284c7",
                  }}
                >
                  {pelangganModalMode === "edit" ? (
                    <Edit3 size={15} />
                  ) : (
                    <Users size={15} />
                  )}
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "13.5px",
                      fontWeight: "800",
                      color: "#0f172a",
                    }}
                  >
                    {pelangganModalMode === "edit"
                      ? "Edit Identitas Pelanggan"
                      : "Tambah Pelanggan Baru"}
                  </h3>
                  <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                    {pelangganModalMode === "edit"
                      ? "Perbarui data pelanggan di database dan formulir pesanan"
                      : "Simpan ke master pelanggan & otomatis terpilih di pesanan"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPelangganModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSavePelanggan}
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "11px",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    Kode Pelanggan
                  </label>
                  <input
                    type="text"
                    value={pelangganForm.kode_pelanggan}
                    onChange={(e) =>
                      setPelangganForm({
                        ...pelangganForm,
                        kode_pelanggan: e.target.value,
                      })
                    }
                    placeholder="PLG-2026-..."
                    style={{
                      width: "100%",
                      padding: "7px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      color: "#0f172a",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    Kategori Pelanggan
                  </label>
                  <select
                    value={pelangganForm.kategori_pelanggan}
                    onChange={(e) =>
                      setPelangganForm({
                        ...pelangganForm,
                        kategori_pelanggan: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "7px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      color: "#0f172a",
                      backgroundColor: "#ffffff",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="Umum">Umum / Reguler</option>
                    <option value="Reseller">Reseller</option>
                    <option value="Dropship">Dropship</option>
                    <option value="Instansi">Instansi / Korporat</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "3px",
                  }}
                >
                  Nama Pelanggan <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pelangganForm.nama_pelanggan}
                  onChange={(e) =>
                    setPelangganForm({
                      ...pelangganForm,
                      nama_pelanggan: e.target.value,
                    })
                  }
                  placeholder="Contoh: Salmah Khairani Nasution"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "3px",
                  }}
                >
                  No Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={pelangganForm.no_hp}
                  onChange={(e) =>
                    setPelangganForm({
                      ...pelangganForm,
                      no_hp: e.target.value,
                    })
                  }
                  placeholder="Contoh: 081234567890"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "11.5px",
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "3px",
                  }}
                >
                  Alamat Lengkap Pengiriman
                </label>
                <textarea
                  value={pelangganForm.alamat}
                  onChange={(e) =>
                    setPelangganForm({
                      ...pelangganForm,
                      alamat: e.target.value,
                    })
                  }
                  placeholder="Alamat lengkap, nama jalan, RT/RW, kelurahan, kecamatan, kota, kodepos..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "11.5px",
                    color: "#0f172a",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "8px",
                  paddingTop: "10px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsPelangganModalOpen(false)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#64748b",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPelanggan}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 16px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: isSavingPelanggan ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 4px rgba(2, 132, 199, 0.35)",
                  }}
                >
                  <Save size={13} />
                  <span>
                    {isSavingPelanggan ? "Menyimpan..." : "Simpan ke Database"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TAMBAH / EDIT MASTER BANK ─────────────────────────────────── */}
      {isBankModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(3px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "460px",
              maxWidth: "95vw",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 18px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "7px",
                    backgroundColor: "#e0f2fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0284c7",
                  }}
                >
                  <CreditCard size={15} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "13.5px",
                      fontWeight: "800",
                      color: "#0f172a",
                    }}
                  >
                    {bankModalMode === "edit"
                      ? "Edit Rekening Bank"
                      : "Tambah Rekening Bank"}
                  </h3>
                  <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                    Kelola data bank & nomor rekening tujuan transfer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSaveBank}
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "11px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "3px",
                  }}
                >
                  Nama Bank <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bankForm.nama_bank}
                  onChange={(e) =>
                    setBankForm({ ...bankForm, nama_bank: e.target.value })
                  }
                  placeholder="Contoh: BCA, Mandiri, BRI, BNI, BSI..."
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "3px",
                  }}
                >
                  Nomor Rekening
                </label>
                <input
                  type="text"
                  value={bankForm.no_rekening}
                  onChange={(e) =>
                    setBankForm({ ...bankForm, no_rekening: e.target.value })
                  }
                  placeholder="Contoh: 1234567890"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "3px",
                  }}
                >
                  Atas Nama Pemilik Rekening
                </label>
                <input
                  type="text"
                  value={bankForm.atas_nama}
                  onChange={(e) =>
                    setBankForm({ ...bankForm, atas_nama: e.target.value })
                  }
                  placeholder="Contoh: PT Ruang Tech / Pemilik Toko"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "6px",
                  paddingTop: "10px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#64748b",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingBank}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 16px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: isSavingBank ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 4px rgba(2, 132, 199, 0.35)",
                  }}
                >
                  <Save size={13} />
                  <span>{isSavingBank ? "Menyimpan..." : "Simpan Bank"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: INPUT PESANAN KE SPK PRODUKSI                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {spkModalOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.72)",
            backdropFilter: "blur(3px)",
            zIndex: 3500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "92vh",
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header Modal SPK */}
            <div
              style={{
                padding: "12px 16px",
                background:
                  "linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "7px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ClipboardList size={16} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "800",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Input Pesanan ke SPK Produksi — {spkModalOrder.no_pesanan}
                  </div>
                  <div style={{ fontSize: "11px", color: "#ddd6fe" }}>
                    Pelanggan: <strong>{spkModalOrder.nama_pembeli}</strong>{" "}
                    {spkModalOrder.nama_toko
                      ? `• Toko: ${spkModalOrder.nama_toko}`
                      : ""}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSpkModalOrder(null)}
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Body Modal SPK */}
            <form
              onSubmit={handleSaveSpk}
              style={{
                padding: "14px 16px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {spkModalOrder.no_spk && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#f5f3ff",
                    border: "1px solid #ddd6fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "11.5px",
                    color: "#5b21b6",
                  }}
                >
                  <span>
                    Pesanan ini sudah terdaftar pada Kode Produksi:{" "}
                    <strong>{spkModalOrder.no_spk}</strong>
                  </span>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        setSpkModalOrder(null);
                        onNavigate("spk");
                      }}
                      style={{
                        padding: "3px 9px",
                        borderRadius: "4px",
                        border: "1px solid #7c3aed",
                        backgroundColor: "#7c3aed",
                        color: "#ffffff",
                        fontSize: "10.5px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Buka Menu SPK →
                    </button>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    Kode Produksi <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={spkForm.kode_produksi}
                    onChange={(e) =>
                      setSpkForm({
                        ...spkForm,
                        kode_produksi: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontWeight: "700",
                      color: "#4c1d95",
                      backgroundColor: "#f5f3ff",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    Nomor SPK <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={spkForm.id_spk}
                    onChange={(e) =>
                      setSpkForm({ ...spkForm, id_spk: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontWeight: "700",
                      color: "#0f172a",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    Nama SPK
                  </label>
                  <input
                    type="text"
                    value={spkForm.nama_spk}
                    onChange={(e) =>
                      setSpkForm({ ...spkForm, nama_spk: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      color: "#0f172a",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    Penjahit / Makloon
                  </label>
                  <input
                    type="text"
                    value={spkForm.penjahit}
                    onChange={(e) =>
                      setSpkForm({ ...spkForm, penjahit: e.target.value })
                    }
                    placeholder="Nama penjahit..."
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      color: "#0f172a",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    Tahapan SPK Awal
                  </label>
                  <SearchableSelect
                    value={spkForm.status_spk}
                    onChange={(val) =>
                      setSpkForm({
                        ...spkForm,
                        status_spk: val || "Potong Pola",
                      })
                    }
                    options={[
                      { value: "Potong Pola", label: "Potong Pola" },
                      { value: "Proses Jahit", label: "Proses Jahit" },
                      { value: "Finishing & QC", label: "Finishing & QC" },
                      { value: "Selesai", label: "Selesai" },
                    ]}
                    size="sm"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={spkForm.tgl_pesan}
                    onChange={(e) =>
                      setSpkForm({ ...spkForm, tgl_pesan: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "5px 8px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      color: "#0f172a",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    Deadline Selesai
                  </label>
                  <input
                    type="date"
                    value={spkForm.deadline}
                    onChange={(e) =>
                      setSpkForm({ ...spkForm, deadline: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "5px 8px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      color: "#0f172a",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "10.5px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "3px",
                  }}
                >
                  Catatan Produksi / Keterangan SPK
                </label>
                <input
                  type="text"
                  value={spkForm.catatan}
                  onChange={(e) =>
                    setSpkForm({ ...spkForm, catatan: e.target.value })
                  }
                  placeholder="Catatan instruksi produksi..."
                  style={{
                    width: "100%",
                    padding: "6px 9px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "11.5px",
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Tabel Item Produk yang masuk ke SPK */}
              <div>
                <div
                  style={{
                    fontSize: "10.5px",
                    fontWeight: "800",
                    color: "#334155",
                    textTransform: "uppercase",
                    marginBottom: "5px",
                  }}
                >
                  Daftar Produk yang Masuk ke SPK ({spkForm.items.length} Item)
                </div>
                <div
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "11px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#f8fafc",
                          color: "#475569",
                          fontSize: "10px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                        }}
                      >
                        <th
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #cbd5e1",
                            borderRight: "1px solid #cbd5e1",
                            textAlign: "center",
                            width: "36px",
                          }}
                        >
                          NO
                        </th>
                        <th
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #cbd5e1",
                            borderRight: "1px solid #cbd5e1",
                            textAlign: "left",
                          }}
                        >
                          SKU & NAMA PRODUK
                        </th>
                        <th
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #cbd5e1",
                            textAlign: "center",
                            width: "90px",
                          }}
                        >
                          QTY SPK
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {spkForm.items.map((it, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom:
                              idx < spkForm.items.length - 1
                                ? "1px solid #e2e8f0"
                                : "none",
                          }}
                        >
                          <td
                            style={{
                              padding: "6px 8px",
                              textAlign: "center",
                              fontWeight: "700",
                              color: "#64748b",
                              borderRight: "1px solid #e2e8f0",
                            }}
                          >
                            {idx + 1}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              borderRight: "1px solid #e2e8f0",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "700",
                                color: "#0f172a",
                              }}
                            >
                              {it.nama_produk}
                            </div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#0284c7",
                                fontFamily: "monospace",
                                fontWeight: "700",
                              }}
                            >
                              SKU: {it.sku || "-"}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              textAlign: "center",
                            }}
                          >
                            <RupiahInput
                              value={it.qty}
                              onChange={(val) => {
                                const nextItems = [...spkForm.items];
                                nextItems[idx] = {
                                  ...nextItems[idx],
                                  qty: val,
                                };
                                setSpkForm({ ...spkForm, items: nextItems });
                              }}
                              style={{
                                width: "70px",
                                padding: "4px 6px",
                                borderRadius: "4px",
                                border: "1px solid #cbd5e1",
                                fontSize: "11.5px",
                                fontWeight: "800",
                                textAlign: "center",
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Modal SPK */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  paddingTop: "10px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSpkModalOrder(null)}
                  style={{
                    height: "30px",
                    padding: "0 14px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#64748b",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingSpk}
                  style={{
                    height: "30px",
                    padding: "0 16px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#7c3aed",
                    color: "#ffffff",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    cursor: isSavingSpk ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    boxShadow: "0 2px 5px rgba(124, 58, 237, 0.35)",
                  }}
                >
                  <ClipboardList size={13} />
                  <span>
                    {isSavingSpk
                      ? "Menyimpan ke SPK..."
                      : spkModalOrder.no_spk
                        ? "Perbarui Data SPK"
                        : "Simpan & Masukkan ke SPK"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
