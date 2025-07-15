// src/hooks/useWaitingMessages.ts
import { useState, useEffect } from "react";

const OPENAI_WAITING_MESSAGES = [
  "Ruminating",
  "Processing your symptoms",
  "Understanding medical context"
];

const DEEPSEEK_WAITING_MESSAGES = [
  "Deep thinking",
  "Analyzing patterns",
  "Seeking insights"
];

export function useWaitingMessages(
  provider: "openai" | "deepseek",
  isActive: boolean
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const messages =
    provider === "openai" ? OPENAI_WAITING_MESSAGES : DEEPSEEK_WAITING_MESSAGES;
  const currentMessage = messages[currentIndex];

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
        setCurrentIndex((prev) => (prev + 1) % messages.length);
      }, 300); // Fade duration
    }, 5000); // Display complete message

    return () => clearTimeout(messageTimer);
  }, [isActive, isTyping, currentIndex, messages.length]);

  return {
    displayText,
    isTyping,
    isFading
  };
}
