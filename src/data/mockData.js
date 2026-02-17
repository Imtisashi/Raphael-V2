// AI Logic for Symptom Matching
export const SYMPTOM_MAP = {
  head: 'Neurologist', migraine: 'Neurologist', brain: 'Neurologist',
  heart: 'Cardiologist', chest: 'Cardiologist', breath: 'Cardiologist',
  pain: 'General Physician', fever: 'General Physician', flu: 'General Physician',
  bone: 'Orthopedic', joint: 'Orthopedic', knee: 'Orthopedic', back: 'Orthopedic',
  skin: 'Dermatologist', rash: 'Dermatologist', acne: 'Dermatologist',
  eye: 'Ophthalmologist', vision: 'Ophthalmologist',
};

// Mock Auth Database
export const MOCK_USERS = [
  { email: 'patient@medicore.com', password: '123', role: 'patient', name: 'Alex Patient' },
  { email: 'doctor@medicore.com', password: '123', role: 'doctor', name: 'Dr. Sarah Chen', doctorId: 1 },
  { email: 'admin@medicore.com', password: '123', role: 'admin', name: 'System Admin' }
];

// Fixed Image URLs using Unsplash
export const INITIAL_DOCTORS = [
  {
    id: 1,
    name: "Dr. Sarah Chen",
    specialty: "Neurologist",
    rating: 4.9,
    reviews: 128,
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300",
    location: "Downtown Medical Hub",
    experience: "12 Years",
    bio: "Leading specialist in migraine research and neural pathways.",
    slots: ["09:00 AM", "10:30 AM", "02:00 PM"],
    price: "$150"
  },
  {
    id: 2,
    name: "Dr. James Wilson",
    specialty: "Cardiologist",
    rating: 4.8,
    reviews: 245,
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=300",
    location: "Heart & Vascular Inst.",
    experience: "18 Years",
    bio: "Specializes in non-invasive cardiac procedures.",
    slots: ["08:00 AM", "11:00 AM", "03:00 PM"],
    price: "$220"
  },
  {
    id: 3,
    name: "Dr. Emily Carter",
    specialty: "Dermatologist",
    rating: 4.7,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=300&h=300",
    location: "Skin Care Alliance",
    experience: "8 Years",
    bio: "Focuses on cosmetic dermatology and skin cancer prevention.",
    slots: ["09:15 AM", "12:45 PM"],
    price: "$120"
  },
  {
    id: 4,
    name: "Dr. Raj Patel",
    specialty: "Orthopedic",
    rating: 4.9,
    reviews: 310,
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300&h=300",
    location: "Sports Medicine Center",
    experience: "15 Years",
    bio: "Expert in arthroscopic reconstruction.",
    slots: ["08:30 AM", "04:00 PM"],
    price: "$180"
  },
  {
    id: 5,
    name: "Dr. Anita Roy",
    specialty: "General Physician",
    rating: 4.6,
    reviews: 500,
    image: "https://images.unsplash.com/photo-1614608682850-10a26e98bee6?auto=format&fit=crop&q=80&w=300&h=300",
    location: "Community Health Clinic",
    experience: "20 Years",
    bio: "Dedicated to preventative care and holistic family medicine.",
    slots: ["07:30 AM", "05:00 PM"],
    price: "$90"
  }
];