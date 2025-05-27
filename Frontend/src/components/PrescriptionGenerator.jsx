import React, { useState } from 'react';
import { Download, Plus, Trash2, User, FileText, Calendar, Pill, Hospital, Phone, Mail } from 'lucide-react';
import Navbar from './Navbar';

const PrescriptionGenerator = () => {
  const [doctorInfo, setDoctorInfo] = useState({
    name: '',
    specialization: '',
    clinic: '',
    license: '',
    phone: '',
    email: '',
    address: ''
  });

  const [prescription, setPrescription] = useState({
    patientName: '',
    age: '',
    gender: '',
    symptoms: '',
    diagnosis: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    notes: '',
    nextVisit: ''
  });

  const addMedication = () => {
    setPrescription(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }));
  };

  const removeMedication = (index) => {
    setPrescription(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const updateMedication = (index, field, value) => {
    setPrescription(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const generatePDF = async () => {
    // Load jsPDF from CDN if not already loaded
    if (!window.jspdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(script);
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = 210;
    const margin = 20;
    let yPosition = 20;

    // Helper function to add text with word wrapping
    const addWrappedText = (text, x, y, maxWidth, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4);
    };

    // Header - Clinic Info
    doc.setFillColor(168, 218, 220); // Pastel blue
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(18);
    doc.text(doctorInfo.clinic || 'Medical Clinic', margin, 15);
    
    doc.setFontSize(12);
    doc.text(`${doctorInfo.name || 'Doctor Name'} - ${doctorInfo.specialization || 'Specialization'}`, margin, 25);
    doc.text(`License: ${doctorInfo.license || 'License Number'}`, margin, 32);
    
    if (doctorInfo.address) {
      doc.setFontSize(9);
      yPosition = addWrappedText(doctorInfo.address, margin, 38, 120, 9);
    }
    
    doc.setFontSize(10);
    if (doctorInfo.phone) doc.text(doctorInfo.phone, pageWidth - margin - 40, 25);
    if (doctorInfo.email) doc.text(doctorInfo.email, pageWidth - margin - 40, 32);

    yPosition = 60;

    // Date
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin - 30, yPosition);
    yPosition += 15;

    // Patient Information
    doc.setFillColor(244, 208, 213); // Pastel pink
    doc.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 25, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('PATIENT INFORMATION', margin, yPosition + 5);
    
    yPosition += 15;
    doc.setFontSize(11);
    doc.text(`Name: ${prescription.patientName || 'N/A'}`, margin, yPosition);
    doc.text(`Age: ${prescription.age || 'N/A'}`, margin + 80, yPosition);
    doc.text(`Gender: ${prescription.gender || 'N/A'}`, margin + 120, yPosition);
    yPosition += 20;

    // Symptoms & Diagnosis
    if (prescription.symptoms) {
      doc.setFillColor(255, 248, 220); // Pastel yellow
      doc.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 15, 'F');
      doc.setFontSize(12);
      doc.text('SYMPTOMS:', margin, yPosition + 5);
      yPosition += 10;
      doc.setFontSize(10);
      yPosition = addWrappedText(prescription.symptoms, margin, yPosition, pageWidth - 2 * margin);
      yPosition += 10;
    }

    if (prescription.diagnosis) {
      doc.setFillColor(230, 230, 250); // Pastel lavender
      doc.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 15, 'F');
      doc.setFontSize(12);
      doc.text('DIAGNOSIS:', margin, yPosition + 5);
      yPosition += 10;
      doc.setFontSize(10);
      yPosition = addWrappedText(prescription.diagnosis, margin, yPosition, pageWidth - 2 * margin);
      yPosition += 10;
    }

    // Medications
    if (prescription.medications.some(med => med.name)) {
      doc.setFillColor(221, 245, 219); // Pastel green
      doc.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 15, 'F');
      doc.setFontSize(14);
      doc.text('PRESCRIPTION', margin, yPosition + 5);
      yPosition += 20;

      prescription.medications.forEach((med, index) => {
        if (med.name) {
          doc.setFontSize(12);
          doc.text(`${index + 1}. ${med.name}`, margin, yPosition);
          yPosition += 8;
          
          doc.setFontSize(10);
          if (med.dosage) doc.text(`   Dosage: ${med.dosage}`, margin, yPosition), yPosition += 6;
          if (med.frequency) doc.text(`   Frequency: ${med.frequency}`, margin, yPosition), yPosition += 6;
          if (med.duration) doc.text(`   Duration: ${med.duration}`, margin, yPosition), yPosition += 6;
          if (med.instructions) {
            yPosition = addWrappedText(`   Instructions: ${med.instructions}`, margin, yPosition, pageWidth - 2 * margin, 10);
          }
          yPosition += 5;
        }
      });
    }

    // Notes
    if (prescription.notes) {
      yPosition += 5;
      doc.setFillColor(255, 229, 204); // Pastel orange
      doc.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 15, 'F');
      doc.setFontSize(12);
      doc.text('NOTES & ADVICE:', margin, yPosition + 5);
      yPosition += 15;
      doc.setFontSize(10);
      yPosition = addWrappedText(prescription.notes, margin, yPosition, pageWidth - 2 * margin);
    }

    // Next Visit
    if (prescription.nextVisit) {
      yPosition += 10;
      doc.setFontSize(11);
      doc.text(`Next Visit: ${prescription.nextVisit}`, margin, yPosition);
    }

    // Footer
    yPosition = Math.max(yPosition + 20, 250);
    doc.setDrawColor(168, 218, 220);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    doc.text(`Dr. ${doctorInfo.name || 'Doctor Name'}`, margin, yPosition);
    doc.text('Digital Signature', pageWidth - margin - 30, yPosition);

    // Save the PDF
    const fileName = prescription.patientName 
      ? `prescription_${prescription.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      : `prescription_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8 border border-white/20">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Digital Prescription Generator
            </h1>
            <p className="text-gray-600">Create professional medical prescriptions instantly</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Doctor Information */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Doctor Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Name</label>
                <input
                  type="text"
                  value={doctorInfo.name}
                  onChange={(e) => setDoctorInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50"
                  placeholder="Dr. John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                <input
                  type="text"
                  value={doctorInfo.specialization}
                  onChange={(e) => setDoctorInfo(prev => ({ ...prev, specialization: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50"
                  placeholder="General Physician"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clinic/Hospital Name</label>
                <input
                  type="text"
                  value={doctorInfo.clinic}
                  onChange={(e) => setDoctorInfo(prev => ({ ...prev, clinic: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50"
                  placeholder="HealthCare Medical Center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                <input
                  type="text"
                  value={doctorInfo.license}
                  onChange={(e) => setDoctorInfo(prev => ({ ...prev, license: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50"
                  placeholder="MD-12345"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={doctorInfo.phone}
                    onChange={(e) => setDoctorInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={doctorInfo.email}
                    onChange={(e) => setDoctorInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50"
                    placeholder="doctor@clinic.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Address</label>
                <textarea
                  value={doctorInfo.address}
                  onChange={(e) => setDoctorInfo(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50 resize-none"
                  rows="2"
                  placeholder="123 Medical Street, City, State 12345"
                />
              </div>
            </div>
          </div>

          {/* Patient & Prescription */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-pink-400 to-red-400 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Patient & Prescription</h2>
            </div>

            <div className="space-y-6">
              {/* Patient Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Patient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={prescription.patientName}
                    onChange={(e) => setPrescription(prev => ({ ...prev, patientName: e.target.value }))}
                    className="px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/70"
                    placeholder="Patient Name"
                  />
                  <input
                    type="number"
                    value={prescription.age}
                    onChange={(e) => setPrescription(prev => ({ ...prev, age: e.target.value }))}
                    className="px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/70"
                    placeholder="Age"
                  />
                  <select
                    value={prescription.gender}
                    onChange={(e) => setPrescription(prev => ({ ...prev, gender: e.target.value }))}
                    className="px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/70"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Symptoms & Diagnosis */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms</label>
                  <textarea
                    value={prescription.symptoms}
                    onChange={(e) => setPrescription(prev => ({ ...prev, symptoms: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50 resize-none"
                    rows="3"
                    placeholder="Describe patient's symptoms..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                  <textarea
                    value={prescription.diagnosis}
                    onChange={(e) => setPrescription(prev => ({ ...prev, diagnosis: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50 resize-none"
                    rows="3"
                    placeholder="Medical diagnosis..."
                  />
                </div>
              </div>

              {/* Medications */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-lg font-medium text-gray-800">Medications</label>
                  <button
                    onClick={addMedication}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-blue-400 text-white rounded-xl hover:from-green-500 hover:to-blue-500 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Add Medication
                  </button>
                </div>

                <div className="space-y-4">
                  {prescription.medications.map((medication, index) => (
                    <div key={index} className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Pill className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-gray-800">Medication {index + 1}</span>
                        </div>
                        {prescription.medications.length > 1 && (
                          <button
                            onClick={() => removeMedication(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={medication.name}
                          onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all bg-white/70"
                          placeholder="Medication name"
                        />
                        <input
                          type="text"
                          value={medication.dosage}
                          onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all bg-white/70"
                          placeholder="Dosage (e.g., 500mg)"
                        />
                        <input
                          type="text"
                          value={medication.frequency}
                          onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all bg-white/70"
                          placeholder="Frequency (e.g., 3 times daily)"
                        />
                        <input
                          type="text"
                          value={medication.duration}
                          onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all bg-white/70"
                          placeholder="Duration (e.g., 7 days)"
                        />
                      </div>
                      <textarea
                        value={medication.instructions}
                        onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                        className="w-full mt-3 px-3 py-2 rounded-lg border border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all bg-white/70 resize-none"
                        rows="2"
                        placeholder="Special instructions (e.g., take with food)"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes & Next Visit */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes & Advice</label>
                  <textarea
                    value={prescription.notes}
                    onChange={(e) => setPrescription(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50 resize-none"
                    rows="3"
                    placeholder="Additional notes, dietary advice, precautions..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Next Visit</label>
                  <input
                    type="text"
                    value={prescription.nextVisit}
                    onChange={(e) => setPrescription(prev => ({ ...prev, nextVisit: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-white/50"
                    placeholder="e.g., After 1 week, Follow-up in 2 weeks"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Generate PDF Button */}
        <div className="mt-8 text-center">
          <button
            onClick={generatePDF}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-semibold rounded-2xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-xl hover:shadow-2xl"
          >
            <Download className="w-6 h-6" />
            Generate & Download Prescription PDF
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default PrescriptionGenerator;