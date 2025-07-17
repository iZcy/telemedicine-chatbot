// src/hooks/useWaitingMessages.ts
import { useState, useEffect } from "react";

const WAITING_MESSAGES = [
  "Sedang berfikir mendalam...",
  "Menganalisis gejala Anda...",
  "Mencari informasi medis...",
  "Memproses konteks kesehatan...",
  "Menyusun respons yang akurat..."
];

export function useWaitingMessages(isActive: boolean) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const currentMessage = WAITING_MESSAGES[currentIndex];

  // Typing effect for current message
  useEffect(() => {
    if (!isActive) {
      setDisplayText("");
      setCurrentIndex(0);
      setIsTyping(false);
      setIsFading(false);
      return;
    }

    setIsTyping(true);
    setIsFading(false);
    setDisplayText("");

    // Type out the current message character by character
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex < currentMessage.length) {
        setDisplayText(currentMessage.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 50); // Type each character every 50ms

    return () => clearInterval(typingInterval);
  }, [currentMessage, isActive]);

  // Change message after display time
  useEffect(() => {
    if (!isActive || isTyping) return;

    const messageTimer = setTimeout(() => {
      setIsFading(true);

      // After fade out, change to next message
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % WAITING_MESSAGES.length);
      }, 300); // Fade duration
    }, 4000); // Display complete message

    return () => clearTimeout(messageTimer);
  }, [isActive, isTyping, currentIndex]);

  return {
    displayText,
    isTyping,
    isFading
  };
}
