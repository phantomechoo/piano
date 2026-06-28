// ==========================================
// 1. ANA DEĞİŞKENLER VE SES MOTORU AYARLARI
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

let isRecording = false;
let recordingStartTime = 0;
let recordedNotes = []; // Kaydedilen notaları ve zamanlarını tutacak dizi

// HTML Elementlerini Seçiyoruz
const pianoKeys = document.querySelectorAll('.key');
const recordBtn = document.getElementById('recordBtn');
const playBtn = document.getElementById('playBtn');

// Notaların Hertz (Frekans) Değerleri
const frequencies = {
  'C': 261.63,  // Do
  'Db': 277.18, // Do#
  'D': 293.66,  // Re
  'Eb': 311.13, // Re#
  'E': 329.63,  // Mi
  'F': 349.23,  // Fa
  'Gb': 369.99, // Fa#
  'G': 392.00,  // Sol
  'Ab': 415.30, // Sol#
  'H': 440.00,  // La
  'Bb': 466.16, // La#
  'B': 493.88   // Si
};

// Klavye Harfleri - Nota Eşleştirmesi
const keyMap = {
  'a': 'C',  'w': 'Db',
  's': 'D',  'e': 'Eb',
  'd': 'E',
  'f': 'F',  't': 'Gb',
  'g': 'G',  'y': 'Ab',
  'h': 'H',  'u': 'Bb',
  'j': 'B'
};

// ==========================================
// 2. FONKSİYONLAR (Ses Üretimi ve Kayıt)
// ==========================================

// Bilgisayarın ses kartını kullanarak yapay nota sesi üreten ana fonksiyon
function playNote(frequency) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = 'triangle'; // Piyano rengine en yakın dalga tipi
  oscillator.frequency.value = frequency;

  const now = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(1, now);
  // Sesin basıldıktan sonra yavaşça azalarak bitmesi (Fade-out efekti)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8); 

  oscillator.start(now);
  oscillator.stop(now + 0.8);
}

// Eğer kayıt modu aktifse, basılan notayı milisaniyelik zamanıyla hafızaya kaydeder
function recordNoteIfNeeded(note) {
  if (isRecording) {
    const elapsed = audioCtx.currentTime - recordingStartTime;
    recordedNotes.push({ note: note, time: elapsed });
  }
}

// ==========================================
// 3. FARE VE TELEFON DOKUNMA OLAYLARI (Pointer)
// ==========================================
pianoKeys.forEach(key => {
  key.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // Mobilde ekranın kaymasını engeller
    
    const note = key.dataset.note;
    const frequency = frequencies[note];
    
    if (frequency) {
      playNote(frequency);
      recordNoteIfNeeded(note); // Kayıt kontrolü
    }
    key.classList.add('active');
  });
});

window.addEventListener('pointerup', () => {
  pianoKeys.forEach(key => key.classList.remove('active'));
});

// ==========================================
// 4. BİLGİSAYAR KLAVYESİ OLAYLARI (Keydown/Keyup)
// ==========================================
window.addEventListener('keydown', (e) => {
  const pressedKey = e.key.toLowerCase();
  const targetNote = keyMap[pressedKey];
  
  // Tuşa basılı tutulduğunda sesin sapıtmasını engellemek için (!e.repeat)
  if (targetNote && !e.repeat) {
    const frequency = frequencies[targetNote];
    if (frequency) {
      playNote(frequency);
      recordNoteIfNeeded(targetNote); // Kayıt kontrolü
    }
    
    const pianoKeyElement = document.querySelector(`.key[data-note="${targetNote}"]`);
    if (pianoKeyElement) pianoKeyElement.classList.add('active');
  }
});

window.addEventListener('keyup', (e) => {
  const pressedKey = e.key.toLowerCase();
  const targetNote = keyMap[pressedKey];
  
  if (targetNote) {
    const pianoKeyElement = document.querySelector(`.key[data-note="${targetNote}"]`);
    if (pianoKeyElement) pianoKeyElement.classList.remove('active');
  }
});

// ==========================================
// 5. KAYIT VE OYNATMA BUTONLARININ MANTIĞI
// ==========================================

// Kaydet butonuna tıklandığında
recordBtn.addEventListener('click', () => {
  if (!isRecording) {
    // Kaydı Başlat
    isRecording = true;
    recordedNotes = []; // Eski kaydı temizle
    if (!audioCtx) audioCtx = new AudioContext();
    recordingStartTime = audioCtx.currentTime;
    
    recordBtn.textContent = "⏱️ Kaydediliyor...";
    recordBtn.classList.add('recording');
    playBtn.disabled = true; // Kayıt yaparken dinleme butonu kapansın
  } else {
    // Kaydı Durdur
    isRecording = false;
    recordBtn.textContent = "🔴 Kaydet";
    recordBtn.classList.remove('recording');
    
    // Eğer hafızaya en az bir nota kaydedildiyse Dinle butonunu aç
    if (recordedNotes.length > 0) {
      playBtn.disabled = false;
    }
  }
});

// Dinle (Oynat) butonuna tıklandığında
playBtn.addEventListener('click', () => {
  if (recordedNotes.length === 0) return;
  
  playBtn.disabled = true;  // Çalma esnasında butonlar kilitlenir
  recordBtn.disabled = true;

  // Kaydedilen notaları, aralarındaki zaman farkına göre sırayla tetikliyoruz
  recordedNotes.forEach(item => {
    setTimeout(() => {
      const frequency = frequencies[item.note];
      if (frequency) {
        playNote(frequency);
        
        // Dinlerken ekrandaki tuşların da basılı gibi parlaması (Görsel Efekt)
        const pianoKeyElement = document.querySelector(`.key[data-note="${item.note}"]`);
        if (pianoKeyElement) {
          pianoKeyElement.classList.add('active');
          setTimeout(() => pianoKeyElement.classList.remove('active'), 300);
        }
      }
    }, item.time * 1000); // Saniyeyi milisaniyeye çeviriyoruz (setTimeout için)
  });

  // Şarkının çalma süresi bittiğinde buton kilitlerini tekrar açıyoruz
  const totalDuration = recordedNotes[recordedNotes.length - 1].time * 1000 + 800;
  setTimeout(() => {
    playBtn.disabled = false;
    recordBtn.disabled = false;
  }, totalDuration);
});