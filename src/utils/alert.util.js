import Swal from 'sweetalert2';

// Ensure container is always on top of all fullscreen modals (z-index > 99999)
const ensureTopZIndex = () => {
  const container = Swal.getContainer();
  if (container) {
    container.style.zIndex = '99999999';
  }
};

// Custom SweetAlert2 configured for Modern Admin theme
const customSwal = Swal.mixin({
  confirmButtonColor: '#059669',
  cancelButtonColor: '#ef4444',
  buttonsStyling: true,
  didOpen: ensureTopZIndex,
  customClass: {
    popup: 'swal2-pesantren-popup',
    confirmButton: 'swal2-pesantren-btn',
    cancelButton: 'swal2-pesantren-btn-cancel'
  }
});

// Toast notification (top-end)
export const toastSuccess = (title) => {
  return Swal.fire({
    icon: 'success',
    title: title || 'Berhasil',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    didOpen: ensureTopZIndex
  });
};

export const toastError = (title) => {
  return Swal.fire({
    icon: 'error',
    title: title || 'Terjadi kesalahan',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    didOpen: ensureTopZIndex
  });
};

// Modal Alert
export const showSuccess = (title, text = '') => {
  return customSwal.fire({
    icon: 'success',
    title: title || 'Berhasil!',
    text,
    confirmButtonText: 'Tutup'
  });
};

export const showError = (title, text = '') => {
  return customSwal.fire({
    icon: 'error',
    title: title || 'Gagal!',
    text,
    confirmButtonText: 'Mengerti'
  });
};

export const showWarning = (title, text = '') => {
  return customSwal.fire({
    icon: 'warning',
    title: title || 'Peringatan!',
    text,
    confirmButtonText: 'OK'
  });
};

// Confirmation Dialog
export const showConfirm = async (title, text = '', confirmButtonText = 'Ya, Lanjutkan', cancelButtonText = 'Batal') => {
  const result = await customSwal.fire({
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true
  });
  return result.isConfirmed;
};

export default customSwal;
