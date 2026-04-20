import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- PATIENT RECEIPT / TAX INVOICE ---
export const generateReceipt = (appointment) => {
  try {
    if (!appointment) {
      alert("Error: No appointment data to print.");
      return;
    }

    const doc = new jsPDF();
    const primaryColor = [13, 148, 136]; // Teal-600

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
    doc.text(`REF: #${appointment.transaction_id || 'PENDING'}`, 190, 28, null, null, 'right');

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
          'Medical Consultation Fee', 
          appointment.transaction_id || '-', 
          appointment.payment_status?.toUpperCase() || 'PAID', 
          appointment.amount || '0'
        ],
        ['Platform Service Charge', '-', 'INCLUDED', '₹10.00']
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
      foot: [['', '', 'TOTAL', appointment.amount || '0']]
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
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.text("Rapha'l - Doctor Payout Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${date}`, 14, 28);

    const rows = payouts.map(p => [
      p.doctorName,
      p.totalAppointments,
      `Rs. ${p.totalCollected}`,
      `Rs. ${p.platformShare}`,
      `Rs. ${p.doctorShare}` // Net Payable
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Doctor Name', 'Appts', 'Total Collection', 'Platform Fee', 'Net Payable to Dr.']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [55, 65, 81] },
      columnStyles: { 4: { fontStyle: 'bold', textColor: [220, 38, 38] } }
    });

    doc.save(`Payout_Report_${date}.pdf`);
  } catch (error) {
    console.error("Report Generation Error:", error);
    alert("Failed to generate report.");
  }
};