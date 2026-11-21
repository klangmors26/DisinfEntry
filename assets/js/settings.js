/* ============================================================
   System Settings — save, logo preview, API key management.
   ========================================================== */

(() => {
  $(document).ready(() => {

    /* ---- Save ---- */
    $('#settingsForm').on('submit', async (ev) => {
      ev.preventDefault();

      const fd = new FormData(ev.target);
      fd.append('action', 'save');

      const btn = $('#saveSettings');
      btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>Saving…');

      try {
        const res = await App.api('api/settings.php', { method: 'POST', body: fd });
        App.toast(res.message, 'success');
        // Threshold, refresh interval, name and logo all affect the shell.
        setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        App.toast(err.message, 'danger');
      } finally {
        btn.prop('disabled', false).html('<i class="bi bi-save me-1"></i>Save Settings');
      }
    });

    /* ---- Logo preview ---- */
    $('#logo').on('change', function () {
      const file = this.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        App.toast('That image is larger than 2 MB.', 'warning');
        this.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        let img = document.getElementById('logoPreview');
        if (!img) {
          const ph = document.getElementById('logoPlaceholder');
          img = document.createElement('img');
          img.id = 'logoPreview';
          img.style.maxWidth = '100%';
          img.style.maxHeight = '100%';
          ph?.replaceWith(img);
        }
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    $('#btnRemoveLogo').on('click', async () => {
      if (!confirm('Remove the current logo?')) return;

      const fd = new FormData();
      fd.append('action', 'remove_logo');

      try {
        const res = await App.api('api/settings.php', { method: 'POST', body: fd });
        App.toast(res.message, 'success');
        setTimeout(() => window.location.reload(), 700);
      } catch (err) {
        App.toast(err.message, 'danger');
      }
    });

    /* ---- Booth WiFi ---- */
    $('#boothWifiForm').on('submit', async (ev) => {
      ev.preventDefault();
      const ssid = $('#wifi_ssid').val().trim();
      if (!confirm(`Send WiFi "${ssid}" to the booth?\n\nThe booth must be online to receive it. It keeps its current WiFi as a fallback until "${ssid}" is in range.`)) return;

      const fd = new FormData(ev.target);
      fd.append('action', 'set_booth_wifi');

      const btn = $('#btnBoothWifi');
      btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>Sending…');
      try {
        const res = await App.api('api/settings.php', { method: 'POST', body: fd });
        App.toast(res.message, 'success');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        App.toast(err.message, 'danger');
        btn.prop('disabled', false).html('<i class="bi bi-send me-1"></i>Send to booth');
      }
    });

    $('.pw-toggle').on('click', function () {
      const input = document.getElementById(this.dataset.target);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      this.querySelector('i').className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
    });

    /* ---- API key ---- */
    $('#btnCopyKey').on('click', () => {
      const f = document.getElementById('apiKey');
      f.select();
      navigator.clipboard?.writeText(f.value);
      App.toast('API key copied to the clipboard.', 'info');
    });

    $('#btnRegenKey').on('click', async () => {
      if (!confirm('Generate a new API key?\n\nAny booth still using the current key will be rejected until its firmware is updated.')) return;

      const fd = new FormData();
      fd.append('action', 'regenerate_key');

      try {
        const res = await App.api('api/settings.php', { method: 'POST', body: fd });
        $('#apiKey').val(res.api_key);
        App.toast(res.message, 'warning');
      } catch (err) {
        App.toast(err.message, 'danger');
      }
    });
  });
})();
