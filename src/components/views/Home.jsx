import React, { useState, useRef, useEffect } from 'react';
import { Search, Brain, Heart, Bone, Stethoscope, Eye, Star, MapPin, Bot, Send, X, MessageSquare, IndianRupee, Loader2 } from 'lucide-react';

export default function HomeView({ setView, setSearchQuery, doctors, setSelectedDoctor }) {
  const categories = [
    { icon: Brain, label: 'Neurology', color: 'bg-purple-100 text-purple-600' },
    { icon: Heart, label: 'Cardiology', color: 'bg-red-100 text-red-600' },
    { icon: Bone, label: 'Orthopedic', color: 'bg-blue-100 text-blue-600' },
    { icon: Stethoscope, label: 'General', color: 'bg-green-100 text-green-600' },
    { icon: Eye, label: 'Vision', color: 'bg-amber-100 text-amber-600' },
  ];

  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: `Hello! I am Rapha'l's advanced AI assistant. I can help you diagnose symptoms, find specific doctors, or manage your schedule. How can I help?` }
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, showChat, isTyping]);

  const generateResponse = (input) => {
    const lowerInput = input.toLowerCase();
    
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
      return "Hello! I'm ready to assist. You can say things like 'I have a headache' or 'Find Dr. Chen'.";
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
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl mx-4 mt-4">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-teal-500 opacity-20 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs font-medium text-teal-200 tracking-wider">AI SYSTEM ONLINE</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Healthcare <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Reimagined.</span>
          </h1>
          <div className="relative mt-6">
            <input 
              type="text" 
              placeholder="Try 'migraine'..."
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length > 2) setView('search');
              }}
            />
            <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
          </div>
        </div>
      </div>

      <div className="px-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Specialties</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((cat, i) => (
            <button 
              key={i}
              onClick={() => {
                setSearchQuery('');
                setView('search');
              }}
              className="flex flex-col items-center gap-2 min-w-[90px] p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className={`p-3 rounded-full ${cat.color}`}>
                <cat.icon size={24} />
              </div>
              <span className="text-xs font-semibold text-slate-600">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Top Rated</h2>
        <div className="grid gap-4">
          {doctors.slice(0, 3).map(doctor => (
            <div 
              key={doctor.id}
              onClick={() => { setSelectedDoctor(doctor); setView('detail'); }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all cursor-pointer flex gap-4"
            >
              <img src={doctor.image} alt={doctor.name} className="w-16 h-16 rounded-xl bg-slate-100 object-cover" />
              <div>
                <h3 className="font-bold text-slate-900">{doctor.name}</h3>
                <p className="text-sm text-teal-600">{doctor.specialty}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-slate-600">{doctor.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
        {showChat && (
          <div className="bg-white rounded-2xl shadow-2xl w-80 md:w-96 flex flex-col border border-slate-200 animate-in slide-in-from-bottom-10 fade-in duration-300 mb-4 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-500 rounded-lg"><Bot size={18} /></div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Rapha'l Assistant</span>
                  <span className="text-[10px] text-teal-200 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online
                  </span>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors"><X size={18} /></button>
            </div>
            
            <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-teal-600 text-white rounded-br-none' 
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
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none text-slate-900 placeholder:text-slate-400"
              />
              <button 
                onClick={handleSendChat} 
                disabled={!chatInput.trim()}
                className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={() => setShowChat(!showChat)}
          className={`p-4 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center gap-2 ${
            showChat ? 'bg-slate-800 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
        >
          {showChat ? <X size={24} /> : <MessageSquare size={24} />}
          {!showChat && <span className="font-bold hidden md:inline">AI Assistant</span>}
        </button>
      </div>
    </div>
  );
}