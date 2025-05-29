
# 🧠 MediChain AI – Decentralized AI-Powered Early Disease Detection & Health Passport

*Built with care by:
👩‍💻 Komal Singh (Team Leader)
👨‍💻 Aditya Gupta
👨‍💻 Aaryan Kalbhor*

> **Detect Early. Own Your Health. Share Securely.**

---

## 🌟 Vision

In today’s world, early detection of diseases and control over one’s own health data shouldn't be a luxury.
**MediChain AI** is our answer to this need—a privacy-first, blockchain-powered, AI-integrated health platform that empowers users to take charge of their well-being and share securely when it matters.

---

## ✅ Core Objectives

* 🧪 Detect diseases early using AI from symptoms or medical images
* 🔐 Allow users to fully own, control, and share their health data securely
* 👨‍⚕️ Let verified doctors request access to records, approved via patient wallet
* 🧾 Help doctors generate prescriptions seamlessly post consultation
* 💬 Enable **real-time chat** between patient and doctor via WebSockets
* 🌍 Guide users via a **multilingual voice-assisted chatbot** that explains the platform and offers symptom guidance
* 🧬 Store medical history on-chain as a **Health Passport NFT (SBT)**

---

## 🧭 Project Journey – Step-by-Step

### 🔹 1. User Registration & Health Identity Creation

* A React-based sign-up form captures user details like name, age, gender, and basic health history.
* Users connect their MetaMask wallet to create an **on-chain Health ID** (NFT or Soulbound Token).
* This Health ID becomes their permanent **Web3 health identity**, linking all future medical interactions.

---

### 🔹 2. AI-Powered Symptom Checker (Text-based)

* Users describe their symptoms via a simple form (English only).
* Our AI model analyzes the input and:

  * Suggests probable diseases
  * Estimates urgency levels
  * Recommends preliminary medical tests
* This empowers users with informed direction, especially in early stages of illness.

---

### 🔹 3. Medical Report-Based Disease Detection (Image Upload)

* Users can upload medical reports like X-rays, MRIs, or lab test screenshots.
* A Python backend with pre-trained deep learning models (CNN/ViT) processes the image.
* The model predicts potential diseases such as:

  * Pneumonia
  * Tuberculosis
  * Diabetic Retinopathy
* Results are returned in real-time and stored securely.

---

### 🔹 4. MedVault – Your Private, Decentralized Health Locker

* Every medical report, test result, and AI prediction is:

  * 🔐 Encrypted
  * ☁️ Uploaded to **IPFS** (InterPlanetary File System)
  * 🔗 The hash and metadata are recorded on **Polygon/Holesky blockchain** using Solidity
* All your records are linked to your **Health Passport NFT**, building your longitudinal health history.

---

### 🔹 5. Doctor Access System (Patient Controlled)

* Verified doctors register on the platform.
* They can request access to specific patient records.
* Patients receive a **wallet-based notification** and can **approve or reject access** via MetaMask.
* Access control is governed by **smart contracts** and logged on-chain.

---

### 🔹 6. Emergency Unlock with Guardian Wallet

* Patients can assign a trusted wallet (guardian) to handle emergencies.
* If the patient is incapacitated, this guardian can unlock records via a **multisig-based emergency contract**.
* This ensures life-saving data is never locked away.

---

### 🔹 7. Doctor–Patient Chat System (WebSockets)

* We’ve implemented a **real-time chat system** so doctors and patients can:

  * Discuss health issues
  * Share updates
  * Clarify prescriptions
* This interaction is fast, direct, and secured.

---

### 🔹 8. Smart Prescription Generator

* After diagnosis, doctors can generate and sign digital prescriptions.
* These are stored in MedVault and can be accessed by the patient anytime.

---

### 🔹 9. Multilingual Voice Chatbot for Platform Support

* A friendly chatbot guides users:

  * Explaining how the platform works
  * Helping them navigate features
  * Giving **basic health advice** based on symptoms
* The chatbot is **multilingual** and **supports voice output**, making it accessible to users across language barriers.

> 📌 Note: This **chatbot** is not the AI symptom checker itself, but a platform assistant.

---

## 🧩 Future Scope

### 🎮 Gamification with Health NFTs

* Users earn NFTs for:

  * Regular checkups
  * Uploading new medical records
  * Following health improvement suggestions
* This encourages consistency and rewards wellness habits.

---

### ⌚ Wearable Integration

* Fitbit and Garmin APIs are used to fetch:

  * Heart rate
  * SpO2
  * Step counts
* Data is visualized on a clean **React + Chart.js dashboard** for easy tracking.

---

### 🔒 Zero-Knowledge Proofs (ZKPs)

* Users can **prove their vaccination or diagnosis status** without revealing their full medical history.
* Crucial for schools, employers, or travel — respecting both privacy and security.

---

## ⚙️ Tech Stack

| Component     | Technology                           | Purpose                                   |
| ------------- | ------------------------------------ | ----------------------------------------- |
| Frontend      | React + Tailwind CSS                 | Responsive user interface                 |
| Backend       | Node.js + Express                    | APIs, authentication, doctor registry     |
| AI Models     | Python (TensorFlow / PyTorch)        | Symptom/disease detection                 |
| Blockchain    | Solidity + Hardhat + Polygon/Holesky | Smart contracts for access control & NFTs |
| Storage       | IPFS                                 | Decentralized file storage for reports    |
| Auth          | MetaMask / WalletConnect             | Web3 login & transaction signing          |
| LLM Chatbot   | LangChain + Groq + TTS               | Multilingual platform guide with voice    |
| Realtime Chat | WebSockets                           | Live doctor-patient communication         |
| Database      | MongoDB                              | User data, logs, doctor info              |

---

## 🔐 MedVault – Privacy-First Health Records

### The Problem:

Health data today is often scattered, institution-controlled, and insecure. In emergencies, critical data may be unavailable when needed most.

### Our Solution:

* All data encrypted + stored on IPFS
* Blockchain ensures immutable metadata trail
* Sharing is **consent-driven** and logged
* Emergency access via **guardian system**
* Creates a **trustless, secure, decentralized health ecosystem**

---

## 🔄 Simplified Data Flow

1. **User Onboards & Creates Health NFT ID**
2. **Inputs symptoms or uploads report → AI makes prediction**
3. **Data stored → Encrypted on IPFS + Blockchain hash**
4. **Doctor requests access → Patient approves → Data shared**
5. **Chat + Prescription via real-time interface**
6. **Emergency? Guardian wallet unlocks records**

---


