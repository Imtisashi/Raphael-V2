import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, Users, ClipboardCheck, TrendingUp, Loader2, FileText, Check, X, CheckCircle, AlertTriangle, Copy, Clock, Activity
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { withHaptic } from '../utils/haptics';
import {
  DEFAULT_PLATFORM_FEE_PERCENT, fetchAppointmentEventsFor, friendlyNetworkError,
  appointmentFromRpc, dispatchPushNotifications, settlementForAmount,
  providerStatus, isProviderApproved, numericAmount, providerStatusTone,
  providerStatusText, isPaymentSubmitted, isPaymentVerified, paymentReviewFor,
  formatMoney, displayAmount, shortDate, ADMIN_AUDIT_META, formatEventTime, APPOINTMENT_EVENT_META
} from '../utils/utils';
import { generateAdminReport } from '../utils/pdfGenerator';
import { MetricPill, SectionHeader, Badge, Button } from '../components/ui/sharedComponents';

function AppointmentTimeline({ events = [], limit = 3, compact = false }) {
  const visibleEvents = events.slice(0, limit);
  if (!visibleEvents.length) return null;

  return (
    <div className={`rounded-lg border border-slate-100 bg-white/80 dark:bg-slate-900/60 dark:border-slate-800 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="mb-3 flex items-center gap-2">
        <Clock size={14} strokeWidth={2.2} className="text-cyan-700 dark:text-cyan-400" />
        <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Activity</p>
      </div>
      <div className="space-y-3">
        {visibleEvents.map((event) => {
          const meta = APPOINTMENT_EVENT_META[event.event_type] || { icon: Activity, tone: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800' };
          const Icon = meta.icon;
          return (
            <div key={event.id} className="flex gap-3">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.tone}`}>
                <Icon size={14} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-xs font-black text-slate-900 dark:text-white break-words">{event.title}</p>
                  <span className="shrink-0 text-right text-[10px] font-bold text-slate-400 dark:text-slate-500">{formatEventTime(event.created_at)}</span>
                </div>
                <p className={`${compact ? 'truncate' : ''} mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400`}>{event.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminDashboardView({
  user,
  doctors,
  showToast,
  onDoctorsChanged = () => {},
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
  onPlatformFeeChanged = () => {},
}) {
  const [adminAppointments, setAdminAppointments] = useState([]);
  const [adminAuditEvents, setAdminAuditEvents] = useState([]);
  const [appointmentEvents, setAppointmentEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [feeDraft, setFeeDraft] = useState(String(platformFeePercent));
  const [savingFee, setSavingFee] = useState(false);
  const doctorLookup = useMemo(() => new Map(doctors.map(doctor => [String(doctor.id), doctor])), [doctors]);

  useEffect(() => {
    setFeeDraft(String(platformFeePercent));
  }, [platformFeePercent]);

  const fetchAdminAppointments = useCallback(async () => {
    if (!supabase) {
      setAdminAppointments([]);
      setAppointmentEvents({});
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select()
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      setAdminAppointments(rows);
      try {
        setAppointmentEvents(await fetchAppointmentEventsFor(rows.map(appointment => appointment.id)));
      } catch {
        setAppointmentEvents({});
      }
    } catch (err) {
      setAppointmentEvents({});
      showToast(friendlyNetworkError(err, 'Unable to load admin payment queue.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchAdminAuditEvents = useCallback(async () => {
    if (!supabase || user?.role !== 'admin') {
      setAdminAuditEvents([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_audit_events')
        .select('id, event_type, entity_type, entity_id, title, body, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      setAdminAuditEvents(data || []);
    } catch {
      setAdminAuditEvents([]);
    }
  }, [user]);

  useEffect(() => {
    fetchAdminAppointments();
    fetchAdminAuditEvents();
  }, [fetchAdminAppointments, fetchAdminAuditEvents]);

  useEffect(() => {
    if (!supabase || user?.role !== 'admin') return undefined;
    const channel = supabase
      .channel('admin-appointment-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAdminAppointments();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_audit_events' }, () => {
        fetchAdminAuditEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAdminAppointments, fetchAdminAuditEvents, showToast, user]);

  const runAdminAppointmentRpc = async (rpcName, params, successMessage) => {
    if (!supabase) {
      showToast('Live backend is not configured.', 'error');
      return;
    }

    try {
      const { data, error } = await supabase.rpc(rpcName, params);
      if (error) throw error;
      const updatedAppointment = appointmentFromRpc(data);
      if (updatedAppointment) {
        setAdminAppointments(prev => prev.map(item => item.id === updatedAppointment.id ? updatedAppointment : item));
      }
      showToast(successMessage);
      dispatchPushNotifications();
      fetchAdminAppointments();
      fetchAdminAuditEvents();
    } catch (err) {
      showToast(friendlyNetworkError(err, 'Unable to update appointment.'), 'error');
    }
  };

  const verifyPayment = (appointment) => {
    runAdminAppointmentRpc('admin_verify_payment', {
      p_appointment_id: appointment.id,
      p_admin_notes: notes[appointment.id] || appointment.admin_notes || '',
    }, 'Payment verified. Booking completed.');
  };

  const rejectPayment = (appointment) => {
    runAdminAppointmentRpc('admin_reject_payment', {
      p_appointment_id: appointment.id,
      p_reason: notes[appointment.id] || 'UTR not found or amount mismatch.',
    }, 'Payment proof rejected.');
  };

  const markPayoutPaid = (appointment) => {
    runAdminAppointmentRpc('admin_mark_payout_paid', {
      p_appointment_id: appointment.id,
    }, 'Doctor payout marked paid.');
  };

  const savePlatformFee = async () => {
    if (!supabase) {
      showToast('Live backend is not configured.', 'error');
      return;
    }

    const nextFee = Number(feeDraft);
    if (!Number.isFinite(nextFee) || nextFee < 0 || nextFee > 50) {
      showToast('Platform fee must be between 0 and 50%.', 'error');
      return;
    }

    setSavingFee(true);
    try {
      const { data, error } = await supabase.rpc('admin_set_platform_fee_percent', {
        p_percent: nextFee,
      });
      if (error) throw error;
      onPlatformFeeChanged(Number(data ?? nextFee));
      showToast('Platform fee updated.');
      fetchAdminAuditEvents();
    } catch (err) {
      showToast(friendlyNetworkError(err, 'Unable to update platform fee.'), 'error');
    } finally {
      setSavingFee(false);
    }
  };

  const reviewProvider = async (doctor, status) => {
    if (!supabase) {
      showToast('Live backend is not configured.', 'error');
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_set_doctor_verification', {
        p_doctor_id: doctor.id,
        p_status: status,
      });
      if (error) throw error;
      showToast(status === 'approved' ? 'Provider approved.' : 'Provider review updated.');
      onDoctorsChanged();
      fetchAdminAuditEvents();
    } catch (err) {
      showToast(friendlyNetworkError(err, 'Unable to review provider.'), 'error');
    }
  };

  const copyDoctorUpi = async (upiId) => {
    if (!upiId) return;
    try {
      if (!window.navigator?.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await window.navigator.clipboard.writeText(upiId);
      showToast('Doctor UPI copied.');
    } catch {
      showToast('Unable to copy UPI.', 'error');
    }
  };

  const paymentQueue = adminAppointments.filter(appointment => isPaymentSubmitted(appointment));
  const verifiedAppointments = adminAppointments.filter(appointment => isPaymentVerified(appointment));
  const payoutDueAppointments = verifiedAppointments.filter(appointment => appointment.payout_status !== 'Paid');
  const pendingProviders = doctors.filter(doctor => providerStatus(doctor) === 'pending');
  const approvedProviders = doctors.filter(isProviderApproved);
  const duePayoutTotal = payoutDueAppointments.reduce((sum, appointment) => sum + (Number(appointment.doctor_payout_amount) || settlementForAmount(appointment.amount, platformFeePercent).doctorShare), 0);
  const payoutRows = doctors
    .map((doctor) => {
      const doctorAppointments = verifiedAppointments.filter(appointment => String(appointment.doctor_id) === String(doctor.id));
      const dueAppointments = doctorAppointments.filter(appointment => appointment.payout_status !== 'Paid');
      const paidAppointments = doctorAppointments.filter(appointment => appointment.payout_status === 'Paid');
      const totalCollected = doctorAppointments.reduce((sum, appointment) => sum + numericAmount(appointment.amount), 0);
      const platformShare = doctorAppointments.reduce((sum, appointment) => sum + (Number(appointment.platform_fee_amount) || settlementForAmount(appointment.amount, platformFeePercent).platformFee), 0);
      const doctorShare = doctorAppointments.reduce((sum, appointment) => sum + (Number(appointment.doctor_payout_amount) || settlementForAmount(appointment.amount, platformFeePercent).doctorShare), 0);
      const dueShare = dueAppointments.reduce((sum, appointment) => sum + (Number(appointment.doctor_payout_amount) || settlementForAmount(appointment.amount, platformFeePercent).doctorShare), 0);
      const paidShare = paidAppointments.reduce((sum, appointment) => sum + (Number(appointment.doctor_payout_amount) || settlementForAmount(appointment.amount, platformFeePercent).doctorShare), 0);
      return {
        doctorName: doctor.name,
        doctorUpi: doctor.upi_id || '',
        totalAppointments: doctorAppointments.length,
        dueAppointments: dueAppointments.length,
        paidAppointments: paidAppointments.length,
        totalCollected,
        platformShare,
        doctorShare,
        dueShare,
        paidShare,
      };
    })
    .filter(row => row.totalAppointments > 0);

  return (
    <div className="min-h-screen app-screen text-slate-900 dark:text-slate-100 p-5 font-sans space-y-5 pb-10">
      <div className="pro-card p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black flex items-center gap-2 text-slate-950 dark:text-white"><Shield size={24} strokeWidth={2.2} className="text-cyan-600 dark:text-cyan-400"/> Admin</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <MetricPill icon={Users} label="Approved" value={approvedProviders.length} tone="text-cyan-700 bg-cyan-50 border-cyan-100 dark:text-cyan-300 dark:bg-cyan-950/40 dark:border-cyan-900/30" />
          <MetricPill icon={Shield} label="Provider review" value={pendingProviders.length} tone="text-violet-700 bg-violet-50 border-violet-100 dark:text-violet-300 dark:bg-violet-950/40 dark:border-violet-900/30" />
          <MetricPill icon={ClipboardCheck} label="Verify" value={paymentQueue.length} tone="text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900/30" />
          <MetricPill icon={TrendingUp} label="Payouts" value={formatMoney(duePayoutTotal)} tone="text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/30" />
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Platform fee</span>
              <div className="mt-1 flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={feeDraft}
                  onChange={(event) => setFeeDraft(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 dark:text-white outline-none"
                />
                <span className="text-sm font-black text-slate-400 dark:text-slate-500">%</span>
              </div>
            </label>
            <Button type="submit" variant="accent" haptic="success" className="px-5 py-3 text-sm" onClick={withHaptic(savePlatformFee, 'success')} disabled={savingFee}>
              {savingFee ? <Loader2 size={16} strokeWidth={2.2} className="animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="pro-card p-5 space-y-4">
        <SectionHeader eyebrow="Audit trail" title="Recent admin actions" />
        {adminAuditEvents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto mb-3 text-slate-300 dark:text-slate-700" size={28} strokeWidth={2.2} />
            <p className="text-sm font-black text-slate-700 dark:text-slate-400">No admin actions recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-list">
            {adminAuditEvents.map((event) => {
              const meta = ADMIN_AUDIT_META[event.event_type] || { icon: ClipboardCheck, tone: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-850' };
              const Icon = meta.icon;
              return (
                <div key={event.id} className="flex items-start gap-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-905 p-3">
                  <div className={`shrink-0 rounded-lg border p-2 ${meta.tone}`}>
                    <Icon size={16} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-black text-slate-950 dark:text-white">{event.title}</p>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400 dark:text-slate-550">{formatEventTime(event.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500 dark:text-slate-400">{event.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pro-card p-5 space-y-4">
        <SectionHeader eyebrow="Provider review" title="Approve specialists" />
        {pendingProviders.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto mb-3 text-slate-300 dark:text-slate-700" size={30} strokeWidth={2.2} />
            <p className="text-sm font-black text-slate-700 dark:text-slate-400">No provider profiles waiting.</p>
          </div>
        ) : (
          <div className="space-y-4 stagger-list">
            {pendingProviders.map((doctor) => (
              <div key={doctor.id} className="rounded-lg border border-violet-100 dark:border-violet-950 bg-violet-50/70 dark:bg-violet-950/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950 dark:text-white">{doctor.name}</p>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{doctor.specialty} - {doctor.district || doctor.location || 'Location not set'}</p>
                  </div>
                  <Badge type="warning">Pending</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="rounded-lg border border-violet-100 dark:border-slate-800 bg-white/85 dark:bg-slate-900 p-3">Fee<br/><span className="text-base font-black dark:text-white">{displayAmount(doctor.price)}</span></div>
                  <div className="rounded-lg border border-violet-100 dark:border-slate-800 bg-white/85 dark:bg-slate-900 p-3">UPI<br/><span className="text-base font-black break-all dark:text-white">{doctor.upi_id || 'Missing'}</span></div>
                  <div className="col-span-2 rounded-lg border border-violet-100 dark:border-slate-800 bg-white/85 dark:bg-slate-900 p-3">Clinic<br/><span className="text-sm font-black dark:text-white">{doctor.clinic_name || doctor.location || 'Not set'}</span></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => reviewProvider(doctor, 'approved')} variant="accent" haptic="success" className="flex-1 py-2.5 text-xs shadow-none"><Check size={16} strokeWidth={2.2}/> Approve</Button>
                  <Button onClick={() => reviewProvider(doctor, 'rejected')} variant="secondary" haptic="warning" className="flex-1 py-2.5 text-xs"><X size={16} strokeWidth={2.2}/> Reject</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pro-card p-5 space-y-4">
        <SectionHeader eyebrow="Manual UTR" title="Payment verification" />
        {loading && (
          <div className="flex items-center justify-center py-8 text-cyan-700">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {!loading && paymentQueue.length === 0 && (
           <div className="text-center py-6">
             <CheckCircle className="mx-auto mb-3 text-emerald-500" size={30} strokeWidth={2.2} />
             <p className="text-sm font-black text-slate-700 dark:text-slate-400">No payment proofs waiting.</p>
           </div>
        )}
        {!loading && paymentQueue.length > 0 && (
          <div className="space-y-4 stagger-list">
            {paymentQueue.map((appointment) => {
              const review = paymentReviewFor(appointment, adminAppointments, platformFeePercent);
              const settlement = review.settlement;
              return (
                <div key={appointment.id} className="rounded-lg border border-amber-100 dark:border-amber-950 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">{appointment.patient_name}</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{appointment.doctor_name} - {shortDate(appointment.appointment_date)} at {appointment.slot}</p>
                    </div>
                    <Badge type={review.ready ? 'success' : 'warning'}>{review.ready ? 'Ready' : 'Review'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-350">
                    <div className="rounded-lg bg-white/80 dark:bg-slate-900 p-3 border border-amber-100 dark:border-slate-850">Amount<br/><span className="text-base font-black dark:text-white">{displayAmount(appointment.amount)}</span></div>
                    <div className="rounded-lg bg-white/80 dark:bg-slate-900 p-3 border border-amber-100 dark:border-slate-850">UTR<br/><span className="text-base font-black break-all dark:text-white">{appointment.transaction_id || 'Cash'}</span></div>
                    <div className="rounded-lg bg-white/80 dark:bg-slate-900 p-3 border border-amber-100 dark:border-slate-850">Doctor payout<br/><span className="text-base font-black dark:text-white">{formatMoney(settlement.doctorShare)}</span></div>
                    <div className="rounded-lg bg-white/80 dark:bg-slate-900 p-3 border border-amber-100 dark:border-slate-850">Platform fee<br/><span className="text-base font-black dark:text-white">{formatMoney(settlement.platformFee)}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {review.checks.map((check) => (
                      <div key={check.label} className={`rounded-lg border bg-white/85 dark:bg-slate-900 p-3 ${check.pass ? 'border-emerald-100 text-emerald-700 dark:border-emerald-950 dark:text-emerald-400' : 'border-red-100 text-red-700 dark:border-red-950 dark:text-red-400'}`}>
                        <div className="flex items-center gap-2">
                          {check.pass ? <CheckCircle size={14} strokeWidth={2.2} /> : <AlertTriangle size={14} strokeWidth={2.2} />}
                          <p className="text-[10px] font-black uppercase">{check.label}</p>
                        </div>
                        <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-350">{check.detail}</p>
                      </div>
                    ))}
                  </div>
                  <AppointmentTimeline events={appointmentEvents[String(appointment.id)] || []} limit={4} />
                  <textarea
                    value={notes[appointment.id] || ''}
                    onChange={(event) => setNotes(prev => ({ ...prev, [appointment.id]: event.target.value }))}
                    placeholder="Admin note or rejection reason"
                    className="w-full rounded-lg border border-amber-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-amber-300 dark:focus:border-amber-500/50 focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-950"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => verifyPayment(appointment)} variant="accent" haptic="success" className="py-3 text-sm shadow-none" disabled={!review.ready}><Check size={16} strokeWidth={2.2}/> Verify</Button>
                    <Button onClick={() => rejectPayment(appointment)} variant="secondary" haptic="warning" className="py-3 text-sm"><X size={16} strokeWidth={2.2}/> Reject</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pro-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader eyebrow="Settlement" title="Doctor payouts" />
          <button
            type="button"
            onClick={withHaptic(() => generateAdminReport(payoutRows), 'success')}
            disabled={!payoutRows.length}
            className="pressable rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-3 py-2 text-xs font-black text-slate-650 dark:text-slate-300 transition-colors hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-40"
          >
            Report
          </button>
        </div>
        {payoutRows.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 px-4 py-8 text-center text-sm font-bold text-slate-500">
            Verified appointments will create payout totals here.
          </div>
        )}
        {payoutRows.map((row) => (
          <div key={row.doctorName} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950 dark:text-white">{row.doctorName}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{row.dueAppointments} due of {row.totalAppointments} verified visits</p>
                {row.doctorUpi && <p className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-550 truncate">UPI: {row.doctorUpi}</p>}
              </div>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatMoney(row.dueShare)}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <div className="rounded-md bg-white dark:bg-slate-900 p-2">Collected: {formatMoney(row.totalCollected)}</div>
              <div className="rounded-md bg-white dark:bg-slate-900 p-2">Platform: {formatMoney(row.platformShare)}</div>
              <div className="rounded-md bg-white dark:bg-slate-900 p-2">Doctor share: {formatMoney(row.doctorShare)}</div>
              <div className="rounded-md bg-white dark:bg-slate-900 p-2">Paid: {formatMoney(row.paidShare)}</div>
            </div>
          </div>
        ))}
        {payoutDueAppointments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Mark individual payouts</p>
            {payoutDueAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="min-w-0">
                  {(() => {
                    const payoutDoctor = doctorLookup.get(String(appointment.doctor_id));
                    return (
                      <>
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">{appointment.doctor_name}</p>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">#{appointment.id} - {formatMoney(appointment.doctor_payout_amount || settlementForAmount(appointment.amount, platformFeePercent).doctorShare)}</p>
                        {payoutDoctor?.upi_id && <p className="mt-1 truncate text-[11px] font-bold text-slate-400 dark:text-slate-500">UPI: {payoutDoctor.upi_id}</p>}
                      </>
                    );
                  })()}
                  {(appointmentEvents[String(appointment.id)] || [])[0] && (
                    <p className="mt-1 truncate text-[11px] font-bold text-slate-450 dark:text-slate-500">{(appointmentEvents[String(appointment.id)] || [])[0].title}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {doctorLookup.get(String(appointment.doctor_id))?.upi_id && (
                    <button
                      type="button"
                      aria-label={`Copy UPI for ${appointment.doctor_name}`}
                      title={`Copy UPI for ${appointment.doctor_name}`}
                      onClick={withHaptic(() => copyDoctorUpi(doctorLookup.get(String(appointment.doctor_id))?.upi_id), 'selection')}
                      className="pressable rounded-lg bg-slate-55 dark:bg-slate-800 px-3 py-2 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-950 hover:text-cyan-700"
                    >
                      <Copy size={14} strokeWidth={2.2} />
                    </button>
                  )}
                  <button type="button" onClick={withHaptic(() => markPayoutPaid(appointment), 'success')} className="pressable rounded-lg bg-emerald-50 dark:bg-emerald-950/45 px-3 py-2 text-xs font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900">
                    Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pro-card p-5">
        <SectionHeader eyebrow="Directory" title="Registered providers" />
        <div className="space-y-3 stagger-list">
          {doctors.map(doc => (
            <div key={doc.id} className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-cyan-200 transition-colors mt-3">
              <div className="min-w-0">
                <h3 className="font-black text-slate-950 dark:text-white text-lg">{doc.name}</h3>
                <p className="text-sm font-bold text-cyan-700 dark:text-cyan-400">{doc.specialty}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge type={providerStatusTone(providerStatus(doc))}>{providerStatusText(providerStatus(doc))}</Badge>
                {providerStatus(doc) !== 'approved' && (
                  <button type="button" onClick={withHaptic(() => reviewProvider(doc, 'approved'), 'success')} className="pressable rounded-lg bg-emerald-50 dark:bg-emerald-950/45 px-3 py-2 text-xs font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900">
                    Approve
                  </button>
                )}
                {providerStatus(doc) === 'approved' && (
                  <button type="button" onClick={withHaptic(() => reviewProvider(doc, 'suspended'), 'warning')} className="pressable rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs font-black text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
