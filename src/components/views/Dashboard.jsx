import React, { useState, useRef, useEffect } from 'react';
import { Search, Brain, Heart, Bone, Stethoscope, Eye, Star, MapPin, Bot, Send, X, MessageSquare } from 'lucide-react';

export default function HomeView({ setView, setSearchQuery, doctors, setSelectedDoctor }) {
  const categories = [
    { icon: Brain, label: 'Neurology', color: 'bg-purple-100 text-purple-600' },
    { icon: Heart, label: 'Cardiology', color: 'bg-red-100 text-red-600' },
    { icon: Bone, label: 'Orthopedic', color: 'bg-blue-100 text-blue-600' },
    { icon: Stethoscope, label: 'General', color: 'bg-green-100 text-green-600' },
    { icon: Eye, label: 'Vision', color: 'bg-amber-100 text-amber-600' },
  ];

  const nagalandDistricts = [
    "Chümoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", 
    "Mokokchung", "Mon", "Niuland", "Noklak", "Peren", 
    "Phek", "Shamator", "Tseminyu", "Tuensang", "Wokha", "Zunheboto"
  ];

  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: `Hello! I am Rapha'l's advanced AI assistant. I can help you diagnose symptoms, find specific doctors in Nagaland, or manage your schedule. How can I help?` }
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, showChat, isTyping]);

  const generateResponse = (input) => {
    const lowerInput = input.toLowerCase();
    
    const mentionedDistrict = nagalandDistricts.find(d => lowerInput.includes(d.toLowerCase()));
    if (mentionedDistrict) {
        setSearchQuery(mentionedDistrict);
        setTimeout(() => setView('search'), 500);
        return `I've detected you are looking for doctors in **${mentionedDistrict}**. I have filtered the search results for that location.`;
    }

    const foundDoctor = doctors.find(d => 
      lowerInput.includes(d.name.toLowerCase()) || 
      lowerInput.includes(d.name.split(' ').pop().toLowerCase())
    );

    if (foundDoctor) {
      setSelectedDoctor(foundDoctor);
      setView('detail');
      return `I found ${foundDoctor.name} (${foundDoctor.specialty}). I've opened their profile for you so you can check their availability.`;
    }

    if (lowerInput.includes('appointment') || lowerInput.includes('schedule') || lowerInput.includes('visit') || lowerInput.includes('booking')) {
      setView('dashboard');
      return "I've navigated you to the 'Visits' dashboard. You can track all your upcoming and past appointments there.";
    }
    if (lowerInput.includes('profile') || lowerInput.includes('setting') || lowerInput.includes('account') || lowerInput.includes('logout')) {
      setView('profile');
      return "Opening your profile settings now.";
    }

    const knowledgeBase = [
      { keys: ['headache', 'migraine', 'brain', 'dizzy', 'seizure', 'confusion', 'head'], specialty: 'Neurologist', response: "These symptoms suggest a neurological issue." },
      { keys: ['heart', 'chest pain', 'palpitation', 'breath', 'blood pressure', 'pulse'], specialty: 'Cardiologist', response: "Chest or heart concerns should be taken seriously." },
      { keys: ['skin', 'rash', 'acne', 'spot', 'hair', 'itch', 'burn'], specialty: 'Dermatologist', response: "For skin conditions, a Dermatologist is the best choice." },
      { keys: ['bone', 'joint', 'knee', 'back', 'spine', 'muscle', 'fracture', 'arthritis'], specialty: 'Orthopedic', response: "It sounds like you might need an Orthopedic specialist." },
      { keys: ['eye', 'vision', 'blur', 'glasses', 'sight'], specialty: 'Ophthalmologist', response: "An Ophthalmologist can help with vision problems." },
      { keys: ['fever', 'cold', 'flu', 'cough', 'sick', 'vomit', 'stomach', 'temperature'], specialty: 'General Physician', response: "For general illness, I recommend seeing a General Physician." },
      { keys: ['tooth', 'teeth', 'gum', 'mouth', 'dental'], specialty: 'Dentist', response: "You should see a Dentist for oral health issues." }
    ];

    for (const entry of knowledgeBase) {
      if (entry.keys.some(k => lowerInput.includes(k))) {
        setSearchQuery(entry.specialty);
        setTimeout(() => setView('search'), 500); 
        return `${entry.response} I've filtered the doctor list for **${entry.specialty}s** nearby.`;
      }
    }

    if (lowerInput.includes('hi') || lowerInput.includes('hello') || lowerInput.includes('hey')) {
      return "Hello! I'm ready to assist. You can say things like 'I have a headache', 'Find Dr. Chen', or 'Doctors in Dimapur'.";
    }
    if (lowerInput.includes('thank')) {
      return "You are very welcome! Your health is my priority.";
    }
    if (lowerInput.includes('price') || lowerInput.includes('cost')) {
      return "Consultation fees vary by doctor. You can see the price listed on each doctor's profile card.";
    }

    return "I'm not 100% sure about that symptom. Could you describe it differently? You can try keywords like 'fever', 'heart', or specific doctor names.";
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText = generateResponse(userMsg.text);
      setChatMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500 relative flex-1">
      
      {/* VIBRANT HERO SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 p-8 text-white shadow-lg mx-4 mt-4">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] pointer-events-none"></div>
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full bg-white/20 blur-[60px] pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></span>
            <span className="text-xs font-bold text-teal-50 tracking-wider">AI SYSTEM ONLINE</span>
          </div>
          <h1 className="text-4xl font-black mb-4 leading-tight drop-shadow-sm">
            Healthcare <br/>
            <span className="text-teal-100">Reimagined.</span>
          </h1>
          
          <div className="flex flex-col gap-3 mt-6">
            <div className="relative shadow-lg rounded-xl">
                <input 
                type="text" 
                placeholder="Try 'migraine' or 'Dr. Chen'..."
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/95 border border-white/20 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-300/50 transition-all"
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length > 2) setView('search');
                }}
                />
                <Search className="absolute left-3 top-3.5 text-teal-500" size={20} />
            </div>
            
            <div className="relative w-full shadow-lg rounded-xl">
                <MapPin className="absolute left-3 top-3.5 text-teal-500 z-10" size={18} />
                <select 
                    value={selectedDistrict}
                    onChange={(e) => {
                        setSelectedDistrict(e.target.value);
                        setSearchQuery(e.target.value); 
                        if (e.target.value) setView('search');
                    }}
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/95 border border-white/20 text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-300/50 appearance-none cursor-pointer font-medium"
                >
                    <option value="" className="text-slate-400">Select Location (Nagaland)</option>
                    {nagalandDistricts.map(dist => (
                        <option key={dist} value={dist} className="text-slate-800">{dist}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-4 pointer-events-none z-10">
                    <svg className="w-4 h-4 text-teal-500 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4">
        <h2 className="text-lg font-black text-slate-800 mb-3 tracking-tight">Specialties</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat, i) => (
            <button 
              key={i}
              onClick={() => {
                setSearchQuery('');
                setView('search');
              }}
              className="flex flex-col items-center gap-2 min-w-[90px] p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-all"
            >
              <div className={`p-3 rounded-2xl ${cat.color}`}>
                <cat.icon size={24} />
              </div>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Top Doctors */}
      <div className="px-4">
        <h2 className="text-lg font-black text-slate-800 mb-3 tracking-tight">Top Rated</h2>
        <div className="grid gap-4">
          {doctors.slice(0, 3).map(doctor => (
            <div 
              key={doctor.id}
              onClick={() => { setSelectedDoctor(doctor); setView('detail'); }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-lg hover:border-teal-200 transition-all cursor-pointer flex gap-4 group"
            >
              <img src={doctor.image} alt={doctor.name} className="w-16 h-16 rounded-xl bg-slate-100 object-cover border border-slate-100" />
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors text-base">{doctor.name}</h3>
                <p className="text-sm font-medium text-teal-600">{doctor.specialty}</p>
                <div className="flex items-center gap-1 mt-1 bg-amber-50 self-start px-2 py-0.5 rounded-md border border-amber-100">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-bold text-amber-700">{doctor.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI CHATBOT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {showChat && (
          <div className="bg-white rounded-2xl shadow-2xl w-80 md:w-96 flex flex-col border border-slate-200 animate-in slide-in-from-bottom-10 fade-in duration-300 mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md"><Bot size={18} /></div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Rapha'l Assistant</span>
                  <span className="text-[10px] text-teal-100 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_#4ade80]"></span> Online
                  </span>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={18} /></button>
            </div>
            
            <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-br-none' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask about symptoms, doctors..."
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
              />
              <button 
                onClick={handleSendChat} 
                disabled={!chatInput.trim()}
                className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/30"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={() => setShowChat(!showChat)}
          className={`p-4 rounded-full shadow-2xl shadow-teal-500/40 transition-all hover:scale-105 flex items-center gap-2 ${
            showChat ? 'bg-slate-800 text-white' : 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white'
          }`}
        >
          {showChat ? <X size={24} /> : <MessageSquare size={24} />}
          {!showChat && <span className="font-bold hidden md:inline">AI Assistant</span>}
        </button>
      </div>
    </div>
  );
}