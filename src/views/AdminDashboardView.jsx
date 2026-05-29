function AdminDashboard({
  user,
  logout,
  doctors,
  showToast,
  onOpenNotifications,
  unreadCount = 0,
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
    <div className="min-h-screen app-screen text-slate-900 p-5 font-sans space-y-5 pb-10">
      <div className="pro-card p-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-black text-cyan-700 uppercase">Operations</p>
            <h1 className="text-3xl font-black flex items-center gap-2 text-slate-950"><Shield className="text-cyan-600"/> Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onOpenNotifications} className="pro-icon-button relative">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-red-500 px-1 text-[10px] font-black leading-5 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            <button onClick={logout} className="pro-icon-button text-red-600 bg-red-50 border-red-100 hover:bg-red-100"><LogOut size={18} /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <MetricPill icon={Users} label="Approved" value={approvedProviders.length} tone="text-cyan-700 bg-cyan-50 border-cyan-100" />
          <MetricPill icon={Shield} label="Provider review" value={pendingProviders.length} tone="text-violet-700 bg-violet-50 border-violet-100" />
          <MetricPill icon={ClipboardCheck} label="Verify" value={paymentQueue.length} tone="text-amber-700 bg-amber-50 border-amber-100" />
          <MetricPill icon={TrendingUp} label="Payouts" value={formatMoney(duePayoutTotal)} tone="text-emerald-700 bg-emerald-50 border-emerald-100" />
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Platform fee</span>
              <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={feeDraft}
                  onChange={(event) => setFeeDraft(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none"
                />
                <span className="text-sm font-black text-slate-400">%</span>
              </div>
            </label>
            <button
              type="button"
              onClick={savePlatformFee}
              disabled={savingFee}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-4 text-xs font-black text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
            >
              {savingFee ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="pro-card p-5 space-y-4">
        <SectionHeader eyebrow="Audit trail" title="Recent admin actions" />
        {adminAuditEvents.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center">
            <FileText className="mx-auto mb-3 text-slate-300" size={28} />
            <p className="text-sm font-black text-slate-700">No admin actions recorded yet.</p>
          </div>
        )}
        {adminAuditEvents.map((event) => {
          const meta = ADMIN_AUDIT_META[event.event_type] || { icon: ClipboardCheck, tone: 'bg-slate-50 text-slate-700 border-slate-100' };
          const Icon = meta.icon;
          return (
            <div key={event.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className={`shrink-0 rounded-lg border p-2 ${meta.tone}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-black text-slate-950">{event.title}</p>
                  <span className="shrink-0 text-[10px] font-bold text-slate-400">{formatEventTime(event.created_at)}</span>
                </div>
                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">{event.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pro-card p-5 space-y-4">
        <SectionHeader eyebrow="Provider review" title="Approve specialists" />
        {pendingProviders.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <Shield className="mx-auto mb-3 text-slate-300" size={30} />
            <p className="text-sm font-black text-slate-700">No provider profiles waiting.</p>
          </div>
        )}
        {pendingProviders.map((doctor) => (
          <div key={doctor.id} className="rounded-lg border border-violet-100 bg-violet-50/70 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{doctor.name}</p>
                <p className="text-xs font-bold text-slate-600">{doctor.specialty} - {doctor.district || doctor.location || 'Location not set'}</p>
              </div>
              <Badge type="warning">Pending</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
              <div className="rounded-lg border border-violet-100 bg-white/85 p-3">Fee<br/><span className="text-base font-black">{displayAmount(doctor.price)}</span></div>
              <div className="rounded-lg border border-violet-100 bg-white/85 p-3">UPI<br/><span className="text-base font-black break-all">{doctor.upi_id || 'Missing'}</span></div>
              <div className="col-span-2 rounded-lg border border-violet-100 bg-white/85 p-3">Clinic<br/><span className="text-sm font-black">{doctor.clinic_name || doctor.location || 'Not set'}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => reviewProvider(doctor, 'approved')} variant="accent" className="py-3 text-sm shadow-none"><Check size={16}/> Approve</Button>
              <Button onClick={() => reviewProvider(doctor, 'rejected')} variant="secondary" className="py-3 text-sm"><X size={16}/> Reject</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="pro-card p-5 space-y-4">
        <SectionHeader eyebrow="Manual UTR" title="Payment verification" />
        {loading && (
          <div className="flex items-center justify-center py-8 text-cyan-700">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {!loading && paymentQueue.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <CheckCircle className="mx-auto mb-3 text-emerald-500" size={30} />
            <p className="text-sm font-black text-slate-700">No payment proofs waiting.</p>
          </div>
        )}
        {paymentQueue.map((appointment) => {
          const review = paymentReviewFor(appointment, adminAppointments, platformFeePercent);
          const settlement = review.settlement;
          return (
            <div key={appointment.id} className="rounded-lg border border-amber-100 bg-amber-50/70 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{appointment.patient_name}</p>
                  <p className="text-xs font-bold text-slate-600">{appointment.doctor_name} - {shortDate(appointment.appointment_date)} at {appointment.slot}</p>
                </div>
                <Badge type={review.ready ? 'success' : 'warning'}>{review.ready ? 'Ready' : 'Review'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                <div className="rounded-lg bg-white/80 p-3 border border-amber-100">Amount<br/><span className="text-base font-black">{displayAmount(appointment.amount)}</span></div>
                <div className="rounded-lg bg-white/80 p-3 border border-amber-100">UTR<br/><span className="text-base font-black break-all">{appointment.transaction_id || 'Cash'}</span></div>
                <div className="rounded-lg bg-white/80 p-3 border border-amber-100">Doctor payout<br/><span className="text-base font-black">{formatMoney(settlement.doctorShare)}</span></div>
                <div className="rounded-lg bg-white/80 p-3 border border-amber-100">Platform fee<br/><span className="text-base font-black">{formatMoney(settlement.platformFee)}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {review.checks.map((check) => (
                  <div key={check.label} className={`rounded-lg border bg-white/85 p-3 ${check.pass ? 'border-emerald-100 text-emerald-700' : 'border-red-100 text-red-700'}`}>
                    <div className="flex items-center gap-2">
                      {check.pass ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                      <p className="text-[10px] font-black uppercase">{check.label}</p>
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-slate-700">{check.detail}</p>
                  </div>
                ))}
              </div>
              <AppointmentTimeline events={appointmentEvents[String(appointment.id)] || []} limit={4} />
              <textarea
                value={notes[appointment.id] || ''}
                onChange={(event) => setNotes(prev => ({ ...prev, [appointment.id]: event.target.value }))}
                placeholder="Admin note or rejection reason"
                className="w-full rounded-lg border border-amber-100 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              />
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => verifyPayment(appointment)} variant="accent" className="py-3 text-sm shadow-none" disabled={!review.ready}><Check size={16}/> Verify</Button>
                <Button onClick={() => rejectPayment(appointment)} variant="secondary" className="py-3 text-sm"><X size={16}/> Reject</Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pro-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader eyebrow="Settlement" title="Doctor payouts" />
          <button
            type="button"
            onClick={() => generateAdminReport(payoutRows)}
            disabled={!payoutRows.length}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-40"
          >
            Report
          </button>
        </div>
        {payoutRows.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
            Verified appointments will create payout totals here.
          </div>
        )}
        {payoutRows.map((row) => (
          <div key={row.doctorName} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{row.doctorName}</p>
                <p className="text-xs font-bold text-slate-500">{row.dueAppointments} due of {row.totalAppointments} verified visits</p>
                {row.doctorUpi && <p className="mt-1 text-[11px] font-bold text-slate-400 truncate">UPI: {row.doctorUpi}</p>}
              </div>
              <p className="text-lg font-black text-emerald-700">{formatMoney(row.dueShare)}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
              <div className="rounded-md bg-white p-2">Collected: {formatMoney(row.totalCollected)}</div>
              <div className="rounded-md bg-white p-2">Platform: {formatMoney(row.platformShare)}</div>
              <div className="rounded-md bg-white p-2">Doctor share: {formatMoney(row.doctorShare)}</div>
              <div className="rounded-md bg-white p-2">Paid: {formatMoney(row.paidShare)}</div>
            </div>
          </div>
        ))}
        {payoutDueAppointments.length > 0 && (
          <div className="space-y-2">
            <SectionHeader eyebrow="Due now" title="Ready for payout" />
            <div className="pro-card p-4">
              <p className="text-sm font-bold text-slate-500">
                {payoutDueAppointments.length} verified visits awaiting payout totaling {formatMoney(duePayoutTotal)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}