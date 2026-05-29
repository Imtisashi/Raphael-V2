import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DEFAULT_PLATFORM_FEE_PERCENT = Number(import.meta.env.VITE_PLATFORM_FEE_PERCENT || 10);

const moneyValue = (value) => {
  const match = String(value || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  const amount = Number(match?.[0]);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const settlementForAppointment = (appointment, feePercent = DEFAULT_PLATFORM_FEE_PERCENT) => {
  const gross = moneyValue(appointment?.amount);
  const safeFeePercent = Number.isFinite(Number(feePercent)) ? Math.max(0, Number(feePercent)) : DEFAULT_PLATFORM_FEE_PERCENT;
  const fallbackPlatformFee = Math.round(gross * safeFeePercent * 100) / 10000;
  const platformFee = Number(appointment?.platform_fee_amount) || fallbackPlatformFee;
  const doctorShare = Number(appointment?.doctor_payout_amount) || Math.max(0, Math.round((gross - platformFee) * 100) / 100);
  return { gross, platformFee, doctorShare };
};

// --- PATIENT RECEIPT / TAX INVOICE ---
export const generateReceipt = (appointment, feePercent = DEFAULT_PLATFORM_FEE_PERCENT) => {
  try {
    if (!appointment) {
      alert("Error: No appointment data to print.");
      return;
    }

    const doc = new jsPDF();
    const primaryColor = [13, 148, 136]; // Teal-600
    const settlement = settlementForAppointment(appointment, feePercent);
    const reference = appointment.transaction_id || (appointment.payment_mode === 'Cash' ? 'Cash' : '-');
    const paymentStatus = appointment.payment_status?.toUpperCase() || 'PAID';

    // Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Logo Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("RAPHA'L HEALTH", 20, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Healthcare Reimagined", 20, 28);
    
    // Invoice Label
    doc.setFontSize(16);
    doc.text("TAX INVOICE", 190, 20, null, null, 'right');
    doc.setFontSize(10);
    doc.text(`REF: #${reference}`, 190, 28, null, null, 'right');

    // Bill To / Bill From
    doc.setTextColor(0, 0, 0);
    const startY = 55;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("BILLED TO (PATIENT):", 20, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(appointment.patient_name || "Guest Patient", 20, startY + 6);
    doc.text(`Appt ID: ${appointment.id}`, 20, startY + 12);
    
    doc.setFont('helvetica', 'bold');
    doc.text("SERVICE PROVIDER (DOCTOR):", 120, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dr. ${appointment.doctor_name || 'Unknown'}`, 120, startY + 6);
    
    // Parse Date safely
    let dateStr = "N/A";
    try {
      dateStr = new Date(appointment.appointment_date).toLocaleDateString();
    } catch (e) {
      console.error("Date parsing error:", e);
    }

    doc.text(`Date: ${dateStr} @ ${appointment.slot || ''}`, 120, startY + 12);

    // Table (Using functional autoTable for better compatibility)
    autoTable(doc, {
      startY: startY + 20,
      head: [['Description', 'Reference (UTR)', 'Status', 'Amount']],
      body: [
        [
          'Consultation collected',
          reference,
          paymentStatus,
          formatMoney(settlement.gross)
        ],
        ['Platform fee retained', '-', 'INCLUDED', formatMoney(settlement.platformFee)],
        ['Doctor payout due', '-', appointment.payout_status || 'Due', formatMoney(settlement.doctorShare)]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
      foot: [['', '', 'TOTAL COLLECTED', formatMoney(settlement.gross)]]
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 30;
    
    // Stamp
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.circle(170, finalY, 12);
    doc.setFontSize(8);
    doc.setTextColor(13, 148, 136);
    doc.text("VERIFIED", 170, finalY, null, null, 'center');
    doc.text("PAYMENT", 170, finalY + 4, null, null, 'center');

    // Legal Text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("This is a computer-generated invoice.", 105, 280, null, null, 'center');
    
    doc.save(`Raphal_Invoice_${appointment.id}.pdf`);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    alert("Failed to generate PDF. See console for error details.");
  }
};

// --- ADMIN PAYOUT REPORT ---
export const generateAdminReport = (payouts) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    const date = new Date().toLocaleDateString();
    const totals = payouts.reduce((summary, payout) => ({
      totalAppointments: summary.totalAppointments + Number(payout.totalAppointments || 0),
      dueAppointments: summary.dueAppointments + Number(payout.dueAppointments || 0),
      paidAppointments: summary.paidAppointments + Number(payout.paidAppointments || 0),
      totalCollected: summary.totalCollected + Number(payout.totalCollected || 0),
      platformShare: summary.platformShare + Number(payout.platformShare || 0),
      doctorShare: summary.doctorShare + Number(payout.doctorShare || 0),
      dueShare: summary.dueShare + Number(payout.dueShare || 0),
      paidShare: summary.paidShare + Number(payout.paidShare || 0),
    }), {
      totalAppointments: 0,
      dueAppointments: 0,
      paidAppointments: 0,
      totalCollected: 0,
      platformShare: 0,
      doctorShare: 0,
      dueShare: 0,
      paidShare: 0,
    });

    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.text("Rapha'l - Doctor Payout Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${date}`, 14, 28);

    const rows = payouts.map(p => [
      p.doctorName,
      p.doctorUpi || '-',
      p.totalAppointments,
      p.dueAppointments || 0,
      p.paidAppointments || 0,
      formatMoney(p.totalCollected),
      formatMoney(p.platformShare),
      formatMoney(p.doctorShare),
      formatMoney(p.dueShare),
      formatMoney(p.paidShare)
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Doctor', 'UPI', 'Verified', 'Due', 'Paid', 'Collected', 'Platform', 'Doctor Share', 'Due Amount', 'Paid Amount']],
      body: rows,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [55, 65, 81] },
      columnStyles: { 8: { fontStyle: 'bold', textColor: [22, 101, 52] } },
      foot: [[
        'TOTAL',
        '-',
        totals.totalAppointments,
        totals.dueAppointments,
        totals.paidAppointments,
        formatMoney(totals.totalCollected),
        formatMoney(totals.platformShare),
        formatMoney(totals.doctorShare),
        formatMoney(totals.dueShare),
        formatMoney(totals.paidShare),
      ]]
    });

    doc.save(`Payout_Report_${date.replace(/[^\dA-Za-z]+/g, '-')}.pdf`);
  } catch (error) {
    console.error("Report Generation Error:", error);
    alert("Failed to generate report.");
  }
};
