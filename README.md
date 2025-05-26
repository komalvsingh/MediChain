# 🧠 MediChain AI – Decentralized AI-Powered Early Disease Detection & Health Passport  
*Built by 
- Komal Singh :Team Leader
- Aditya Gupta
- Aaryan Kalbhor*  
**Detect Early. Own Your Health. Share Securely.**

---

## ✅ Core Objectives

- 🧪 Use AI to detect diseases early from symptoms or medical reports  
- 🔒 Enable users to fully own and control their health data  
- 🩺 Allow verified doctors to request access with patient-controlled permissions  
- 🌐 Provide multilingual symptom checking for wider accessibility  
- 💡 Link all health history into an on-chain "Health Passport" NFT (or Soulbound Token)  

---

## 🏗️ Project Flow – Step-by-Step

### 🔹 1. User Registration & Health ID Creation  
- React-based sign-up form: Name, age, gender, health history  
- User connects MetaMask → Creates on-chain **Health ID (NFT/SBT)**  
- Unique Web3 health identity established  

### 🔹 2. Symptom Checker via AI Chat (Text Input)  
- User enters symptoms in any language (via LangChain + Whisper + OpenAI)  
- AI suggests:  
  - Probable diseases  
  - Urgency level  
  - Recommended medical tests  
  - Nearby clinics (Google Maps API)  

### 🔹 3. Disease Detection via Report Upload (Image Input)  
- Upload medical image (X-ray, MRI, Lab Report)  
- Python backend runs pre-trained model (CNN / ViT)  
- Predicts conditions like Pneumonia, TB, Diabetic Retinopathy  
- Result shown + stored securely  

### 🔹 4. MedVault – Encrypted Health Data Storage  
- All medical records and AI results:  
  - 🔐 Encrypted  
  - ☁️ Uploaded to IPFS  
  - 🔗 Hash + metadata stored on Polygon/Holesky using Solidity  
- Each record becomes part of a **Health Passport NFT (SBT)**

### 🔹 5. Access Management  
- Doctors register with verification  
- Can **request access** to patient records  
- Patient receives UI alert → Approves/Rejects using MetaMask signature  
- Smart contract grants/rejects read permissions  

### 🔹 6. Emergency Unlock (MedVault Guardian System)  
- Patient assigns guardian wallet (parent/doctor)  
- If unresponsive, guardian unlocks via multisig/emergency contract logic  
- Ensures critical data is never locked out  

---

## 🧩 Bonus Features

### 🔸 Gamification  
- NFTs rewarded for healthy habits:  
  - Regular checkups  
  - Uploading reports  
  - Following health suggestions  
- Boosts engagement and routine  

### 🔸 Wearable API Integration  
- Fitbit/Garmin API:  
  - Real-time vitals → Heart rate, SpO2, steps  
- Health Dashboard with React + Chart.js  

### 🔸 Zero-Knowledge Proofs (ZKPs)  
- Prove vaccination or diagnosis status **without revealing entire record**  
- Useful for employers, schools, immigration  

---

## ⚙️ Tech Stack Overview

| Component     | Tech Used                              | Purpose                                      |
|---------------|----------------------------------------|----------------------------------------------|
| Frontend      | React + Tailwind CSS                   | User interface                               |
| Backend       | Node.js + Express                      | APIs, authentication, doctor registry        |
| AI Models     | Python (TensorFlow / PyTorch)          | Disease image analysis, symptom checker      |
| Blockchain    | Solidity + Hardhat + Polygon/Holesky   | Record storage, permissions, NFT logic       |
| Storage       | IPFS                                   | Decentralized encrypted report storage       |
| Auth          | MetaMask / WalletConnect               | Wallet login + signature verification        |
| NLP / LLM     | LangChain + Whisper + OpenAI           | Multilingual AI assistant for symptoms       |
| Database      | MongoDB                                | User profile, logs, temp cache               |

---

## 🧠 Project Modules

| Module                      | Description                                                                 |
|----------------------------|-----------------------------------------------------------------------------|
| 🪪 Health Passport (NFT/SBT) | Unique user ID with immutable, non-transferable record history             |
| 🧠 AI Diagnosis              | Upload image → Model prediction → Disease detection                        |
| 💬 Symptom Checker          | LLM + LangChain powered multilingual assistant                             |
| 🔐 MedVault                 | IPFS + Smart Contract storage for records                                  |
| 👩‍⚕️ Access System            | Doctors request; users approve via wallet signature                        |
| 🚨 Emergency Unlock         | Guardian wallet for critical access situations                            |
| 🏅 Wellness NFTs            | Gamified rewards for healthy behavior tracking                             |

---

## 🔐 MedVault – Decentralized Health Record System

### 📌 Problem:
Health data today is fragmented, insecure, and often controlled by institutions.

### ✅ Our Solution:
- All health records are encrypted and uploaded to IPFS  
- Smart contracts log metadata + IPFS hash  
- Only the patient can approve sharing, tracked on-chain  
- Emergency fallback via guardian wallet  
- Ensures **trustless, transparent, and privacy-respecting** health data system  

---

## 🔄 Simplified Data Flow Diagram

# 