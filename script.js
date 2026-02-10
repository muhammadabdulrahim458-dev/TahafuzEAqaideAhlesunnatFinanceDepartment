
      const STORAGE_KEY = "accounts_records_v1";
      const REPORT_AUTHOR_KEY = "accounts_report_author_v1";
      const form = document.getElementById("record-form");
      const recordsBody = document.getElementById("records-body");
      const filterType = document.getElementById("filter-type");
      const searchInput = document.getElementById("search-input");
      const resetBtn = document.getElementById("reset-btn");
      const exportCsvBtn = document.getElementById("export-csv");
      const exportExcelBtn = document.getElementById("export-excel");
      const printBtn = document.getElementById("print-report");
      const totalIncomeEl = document.getElementById("total-income");
      const totalExpenseEl = document.getElementById("total-expense");
      const totalBalanceEl = document.getElementById("total-balance");
      const reportAuthorInput = document.getElementById("report-author");
      const FONT_FAMILY = "Jameel Noori Nastaleeq";
      const FONT_WOFF2_PATH = "fonts/Jameel%20Noori%20Nastaleeq.woff2";
      const FONT_WOFF_PATH = "fonts/Jameel%20Noori%20Nastaleeq.woff";

      let editId = null;
      const incomeTypes = new Set(["عطیہ", "وعدہ"]);
      const expenseTypes = new Set(["اخراجات", "فلاحی خرچ"]);

      const getRecords = () => {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      };

      const saveRecords = (records) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      };

      const formatAmount = (value) => {
        const number = Number(value || 0);
        return `₨ ${number.toLocaleString("ur-PK", { maximumFractionDigits: 2 })}`;
      };

      const formatDateTime = (date = new Date()) =>
        new Intl.DateTimeFormat("ur-PK", { dateStyle: "full", timeStyle: "short" }).format(date);

      const escapeHtml = (value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      const sanitizeCell = (value) => String(value ?? "").replace(/\r?\n/g, " ").trim();

      const formatNoteHtml = (value) => {
        if (!value) return "-";
        return escapeHtml(value).replace(/\r?\n/g, "<br />");
      };

      const getFileStamp = (date = new Date()) => {
        const pad = (value) => String(value).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      };

      const resolveAssetUrl = (path) => new URL(path, window.location.href).href;

      const getFontFaceCss = () => `
      @font-face {
        font-family: "${FONT_FAMILY}";
        src: url("${resolveAssetUrl(FONT_WOFF2_PATH)}") format("woff2"),
             url("${resolveAssetUrl(FONT_WOFF_PATH)}") format("woff");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
      `;

      const calculateTotals = (records) => {
        const income = records
          .filter((record) => incomeTypes.has(record.type))
          .reduce((sum, record) => sum + Number(record.amount || 0), 0);
        const expense = records
          .filter((record) => expenseTypes.has(record.type))
          .reduce((sum, record) => sum + Number(record.amount || 0), 0);

        return { income, expense, balance: income - expense };
      };

      const clearForm = () => {
        form.reset();
        editId = null;
        document.getElementById("save-btn").textContent = "Save Records";
      };

      const getFilteredRecords = () => {
        const records = getRecords();
        const typeFilter = filterType.value;
        const query = searchInput.value.trim().toLowerCase();
        return records.filter((record) => {
          const matchesType = typeFilter === "all" || record.type === typeFilter;
          const matchesQuery =
            !query ||
            (record.name || "").toLowerCase().includes(query) ||
            (record.note || "").toLowerCase().includes(query) ||
            (record.type || "").toLowerCase().includes(query);
          return matchesType && matchesQuery;
        });
      };

      const renderTotals = (records) => {
        const { income, expense, balance } = calculateTotals(records);

        totalIncomeEl.textContent = formatAmount(income);
        totalExpenseEl.textContent = formatAmount(expense);
        totalBalanceEl.textContent = formatAmount(balance);
      };

      const renderTable = () => {
        const filtered = getFilteredRecords();
        recordsBody.innerHTML = "";
        renderTotals(filtered);

        if (!filtered.length) {
          recordsBody.innerHTML = `
            <tr>
              <td colspan="6">ابھی کوئی ریکارڈ موجود نہیں۔</td>
            </tr>
          `;
          return;
        }

        filtered.forEach((record) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${record.type}</td>
            <td>${record.name}</td>
            <td>${formatAmount(record.amount)}</td>
            <td>${record.date}</td>
            <td>${record.note || "-"}</td>
            <td>
              <div class="row-actions">
                <button class="table-btn" data-action="edit" data-id="${record.id}">Edit</button>
                <button class="table-btn warn" data-action="delete" data-id="${record.id}">
                  Delete
                </button>
              </div>
            </td>
          `;
          recordsBody.appendChild(row);
        });
      };

      const upsertRecord = (record) => {
        const records = getRecords();
        const index = records.findIndex((item) => item.id === record.id);
        if (index >= 0) {
          records[index] = record;
        } else {
          records.unshift(record);
        }
        saveRecords(records);
        renderTable();
      };

      const deleteRecord = (id) => {
        const records = getRecords().filter((record) => record.id !== id);
        saveRecords(records);
        renderTable();
      };

      const getOrgInfo = () => {
        const titleEl = document.querySelector(".brand-title h1");
        const subtitleEl = document.querySelector(".brand-title p");
        const logoEl = document.querySelector(".brand-logo");
        return {
          title:
            titleEl?.textContent?.trim() ||
            logoEl?.getAttribute("alt")?.trim() ||
            "ادارہ خزانہ",
          subtitle: subtitleEl?.textContent?.trim() || "",
        };
      };

      const getReportMeta = () => {
        const org = getOrgInfo();
        const author = reportAuthorInput?.value.trim() || "";
        const filterLabel =
          filterType.options[filterType.selectedIndex]?.textContent?.trim() || "تمام ریکارڈز";
        const searchQuery = searchInput.value.trim();
        return {
          ...org,
          author: author || "درج نہیں",
          filterLabel,
          searchQuery: searchQuery || "—",
          generatedAt: formatDateTime(),
        };
      };

      const buildReportHtml = (records, { mode = "print" } = {}) => {
        const meta = getReportMeta();
        const totals = calculateTotals(records);
        const amountLabel = (value) =>
          mode === "excel" ? Number(value || 0) : formatAmount(value);

        const rowsHtml = records.length
          ? records
              .map(
                (record) => `
            <tr>
              <td data-label="قسم">${escapeHtml(record.type || "-")}</td>
              <td data-label="نام / ادارہ">${escapeHtml(record.name || "-")}</td>
              <td data-label="رقم" class="amount">${amountLabel(record.amount)}</td>
              <td data-label="تاریخ">${escapeHtml(record.date || "-")}</td>
              <td data-label="تفصیل">${formatNoteHtml(record.note)}</td>
            </tr>
          `,
              )
              .join("")
          : `
            <tr class="empty-row">
              <td colspan="5">ابھی کوئی ریکارڈ موجود نہیں۔</td>
            </tr>
          `;

        return `<!doctype html>
<html lang="ur" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(meta.title)} - رپورٹ</title>
    <style>
      ${getFontFaceCss()}
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "${FONT_FAMILY}", "Noto Nastaliq Urdu", serif;
        color: #1c1b19;
        background: #fff;
      }
      .report {
        padding: 26px 28px 24px;
      }
      .report-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        border-bottom: 2px solid #e6ddcf;
        padding-bottom: 14px;
        margin-bottom: 18px;
      }
      .report-title h1 {
        margin: 0;
        font-size: 28px;
        color: #134236;
        font-weight: 400;
      }
      .report-title p {
        margin: 0;
        font-size: 14px;
        color: #5a5247;
      }
      .report-badge {
        background: #e8f4e8;
        border: 1px solid #cfe6d7;
        color: #134236;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }
      .report-meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px 24px;
        font-size: 13px;
        margin-bottom: 16px;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid #e6ddcf;
        background: #fffaf2;
      }
      .report-meta span {
        color: #5a5247;
      }
      .report-meta strong {
        font-weight: 700;
        margin-right: 6px;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }
      .summary-card {
        border: 1px solid #dfeadf;
        border-radius: 12px;
        padding: 12px 14px;
        background: linear-gradient(180deg, #f5fff7 0%, #ecf8f1 100%);
      }
      .summary-card span {
        font-size: 12px;
        color: #5a5247;
      }
      .summary-card strong {
        display: block;
        margin-top: 6px;
        font-size: 15px;
        color: #134236;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        table-layout: fixed;
      }
      th,
      td {
        border: 1px solid #e6ddcf;
        padding: 9px 10px;
        text-align: right;
        vertical-align: top;
      }
      td {
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      th {
        background: #f5f0e6;
        color: #134236;
        font-weight: 700;
      }
      tbody tr:nth-child(even) {
        background: #fffdf9;
      }
      tbody tr:nth-child(odd) {
        background: #ffffff;
      }
      .amount {
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .note {
        margin-top: 14px;
        font-size: 12px;
        color: #5a5247;
        border-top: 1px dashed #e6ddcf;
        padding-top: 10px;
      }
      @media screen and (max-width: 720px) {
        .report {
          padding: 16px 14px;
        }
        .report-header {
          flex-direction: column;
          align-items: flex-start;
        }
        .report-meta {
          grid-template-columns: 1fr;
        }
        .summary {
          grid-template-columns: 1fr;
        }
        table,
        thead,
        tbody,
        th,
        tr,
        td {
          display: block;
          width: 100%;
        }
        thead {
          display: none;
        }
        tbody tr {
          border: 1px solid #e6ddcf;
          border-radius: 10px;
          padding: 8px 10px;
          margin-bottom: 10px;
          background: #fff;
        }
        tbody tr:last-child {
          margin-bottom: 0;
        }
        td {
          border: none;
          padding: 6px 0;
        }
        td::before {
          content: attr(data-label);
          display: block;
          font-weight: 700;
          color: #134236;
          margin-bottom: 2px;
        }
        .amount {
          white-space: normal;
        }
        .empty-row td {
          text-align: center;
          padding: 10px 0;
        }
      }
      @page {
        size: A4;
        margin: 14mm 12mm;
      }
      @media print {
        html,
        body {
          margin: 0;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .report {
          padding: 0;
        }
        .report-header,
        .report-meta,
        .summary {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .report-header {
          break-after: avoid;
          page-break-after: avoid;
        }
        .report-header {
          flex-direction: row;
          align-items: flex-start;
        }
        .report-meta {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .summary {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        table {
          display: table;
        }
        thead {
          display: table-header-group;
        }
        tbody {
          display: table-row-group;
        }
        tr {
          display: table-row;
        }
        th,
        td {
          display: table-cell;
        }
        td::before {
          content: none !important;
        }
        tbody tr {
          border: none;
          border-radius: 0;
          padding: 0;
          margin: 0;
          background: transparent;
        }
        td {
          border: 1px solid #e6ddcf;
          padding: 9px 10px;
        }
        .amount {
          white-space: nowrap;
        }
        .empty-row td {
          text-align: right;
          padding: 9px 10px;
        }
      }
    </style>
  </head>
  <body>
    <div class="report">
      <div class="report-header">
        <div class="report-title">
          <h1>${escapeHtml(meta.title)}</h1>
          ${meta.subtitle ? `<p>${escapeHtml(meta.subtitle)}</p>` : ""}
        </div>
        <div class="report-badge">مالی رپورٹ</div>
      </div>

      <div class="report-meta">
        <div><span>تیار کردہ:</span><strong>${escapeHtml(meta.author)}</strong></div>
        <div><span>رپورٹ کا وقت:</span><strong>${escapeHtml(meta.generatedAt)}</strong></div>
        <div><span>فلٹر:</span><strong>${escapeHtml(meta.filterLabel)}</strong></div>
        <div><span>تلاش:</span><strong>${escapeHtml(meta.searchQuery)}</strong></div>
        <div><span>ریکارڈز:</span><strong>${records.length}</strong></div>
      </div>

      <div class="summary">
        <div class="summary-card">
          <span>کل آمدنی</span>
          <strong>${formatAmount(totals.income)}</strong>
        </div>
        <div class="summary-card">
          <span>کل اخراجات</span>
          <strong>${formatAmount(totals.expense)}</strong>
        </div>
        <div class="summary-card">
          <span>بیلنس</span>
          <strong>${formatAmount(totals.balance)}</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>قسم</th>
            <th>نام / ادارہ</th>
            <th>رقم</th>
            <th>تاریخ</th>
            <th>تفصیل</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="note">یہ رپورٹ خودکار نظام کے ذریعے تیار کی گئی ہے۔</div>
    </div>
  </body>
</html>`;
      };

      const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      };

      const exportCsv = () => {
        const records = getFilteredRecords();
        if (!records.length) {
          alert("ایکسپورٹ کے لیے کوئی ریکارڈ موجود نہیں۔");
          return;
        }

        const headers = ["قسم", "نام / ادارہ", "رقم", "تاریخ", "تفصیل"];
        const rows = records.map((record) => [
          record.type,
          record.name,
          record.amount,
          record.date,
          record.note || "",
        ]);

        const csv = [headers, ...rows]
          .map((row) =>
            row
              .map((cell) => `"${sanitizeCell(cell).replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\n");

        const stampedName = `records-${getFileStamp()}.csv`;
        const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, stampedName);
      };

      const exportExcel = () => {
        const records = getFilteredRecords();
        if (!records.length) {
          alert("ایکسپورٹ کے لیے کوئی ریکارڈ موجود نہیں۔");
          return;
        }

        const html = buildReportHtml(records, { mode: "excel" });
        const stampedName = `records-${getFileStamp()}.xls`;
        const blob = new Blob([`\uFEFF${html}`], {
          type: "application/vnd.ms-excel;charset=utf-8;",
        });
        downloadBlob(blob, stampedName);
      };

      const printReport = () => {
        const records = getFilteredRecords();
        if (!records.length) {
          alert("پرنٹ کے لیے کوئی ریکارڈ موجود نہیں۔");
          return;
        }

        const html = buildReportHtml(records, { mode: "print" });
        const isMobilePrint = () =>
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

        const runPrintFlow = (targetWindow, cleanup) => {
          const targetDoc = targetWindow.document;
          targetDoc.open();
          targetDoc.write(html);
          targetDoc.close();

          let printed = false;
          const safeCleanup = () => {
            if (cleanup) cleanup();
          };

          const triggerPrint = () => {
            if (printed) return;
            printed = true;
            targetWindow.focus();
            targetWindow.print();
            targetWindow.onafterprint = safeCleanup;
            setTimeout(safeCleanup, 1500);
          };

          const waitForFonts = () => {
            const afterLayout = () => {
              targetWindow.requestAnimationFrame(() => {
                targetWindow.requestAnimationFrame(triggerPrint);
              });
            };
            if (targetDoc.fonts && targetDoc.fonts.ready) {
              targetDoc.fonts.load(`1em "${FONT_FAMILY}"`).catch(() => {});
              targetDoc.fonts.ready
                .then(() => setTimeout(afterLayout, 50))
                .catch(() => afterLayout());
              return;
            }
            setTimeout(afterLayout, 100);
          };

          targetWindow.addEventListener(
            "load",
            () => {
              setTimeout(waitForFonts, 100);
            },
            { once: true },
          );

          setTimeout(() => {
            if (targetDoc.readyState === "complete") {
              waitForFonts();
            }
          }, 350);
        };

        if (isMobilePrint()) {
          const printWindow = window.open("", "_blank", "noopener,noreferrer");
          if (!printWindow) {
            alert("براہِ کرم پاپ اپ کی اجازت دیں تاکہ رپورٹ پرنٹ ہو سکے۔");
            return;
          }
          runPrintFlow(printWindow, () => {
            try {
              printWindow.close();
            } catch (error) {
              /* ignore */
            }
          });
          return;
        }

        const printFrame = document.createElement("iframe");
        printFrame.setAttribute("title", "Print Report");
        printFrame.style.position = "fixed";
        printFrame.style.left = "-9999px";
        printFrame.style.top = "0";
        printFrame.style.width = "1px";
        printFrame.style.height = "1px";
        printFrame.style.opacity = "0";
        printFrame.style.pointerEvents = "none";
        printFrame.style.border = "0";
        document.body.appendChild(printFrame);

        const frameWindow = printFrame.contentWindow;
        if (!frameWindow) {
          printFrame.remove();
          alert("براہِ کرم پاپ اپ کی اجازت دیں تاکہ رپورٹ پرنٹ ہو سکے۔");
          return;
        }

        runPrintFlow(frameWindow, () => {
          printFrame.remove();
        });
      };

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const record = {
          id: editId || crypto.randomUUID(),
          type: document.getElementById("record-type").value,
          amount: document.getElementById("record-amount").value,
          name: document.getElementById("record-name").value.trim(),
          date: document.getElementById("record-date").value,
          note: document.getElementById("record-note").value.trim(),
        };

        upsertRecord(record);
        clearForm();
      });

      recordsBody.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const id = button.dataset.id;
        const action = button.dataset.action;
        const records = getRecords();
        const record = records.find((item) => item.id === id);

        if (!record) return;

        if (action === "edit") {
          editId = record.id;
          document.getElementById("record-type").value = record.type;
          document.getElementById("record-amount").value = record.amount;
          document.getElementById("record-name").value = record.name;
          document.getElementById("record-date").value = record.date;
          document.getElementById("record-note").value = record.note;
          document.getElementById("save-btn").textContent = "اپ ڈیٹ کریں";
          window.scrollTo({ top: 0, behavior: "smooth" });
        }

        if (action === "delete") {
          const confirmed = confirm("کیا آپ واقعی یہ ریکارڈ ڈیلیٹ کرنا چاہتے ہیں؟");
          if (confirmed) {
            deleteRecord(record.id);
          }
        }
      });

      filterType.addEventListener("change", renderTable);
      searchInput.addEventListener("input", renderTable);
      resetBtn.addEventListener("click", clearForm);

      if (reportAuthorInput) {
        const savedAuthor = localStorage.getItem(REPORT_AUTHOR_KEY);
        if (savedAuthor) {
          reportAuthorInput.value = savedAuthor;
        }
        reportAuthorInput.addEventListener("input", () => {
          localStorage.setItem(REPORT_AUTHOR_KEY, reportAuthorInput.value.trim());
        });
      }

      if (exportCsvBtn) exportCsvBtn.addEventListener("click", exportCsv);
      if (exportExcelBtn) exportExcelBtn.addEventListener("click", exportExcel);
      if (printBtn) printBtn.addEventListener("click", printReport);

      renderTable();
