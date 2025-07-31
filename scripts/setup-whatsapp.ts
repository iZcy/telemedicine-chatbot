// scripts/setup-whatsapp.ts
import { whatsappService } from "../server/lib/whatsapp-service";

async function setupWhatsApp() {
  console.log("🚀 Memulai setup WhatsApp...");

  try {
    // Initialize WhatsApp service
    await whatsappService.initialize();

    console.log("✅ WhatsApp service berhasil diinisialisasi");
    console.log("📱 Scan QR code dengan WhatsApp Anda untuk login");

    // Keep the process running
    process.on("SIGINT", async () => {
      console.log("\n📱 Menutup koneksi WhatsApp...");
      await whatsappService.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Gagal setup WhatsApp:", error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupWhatsApp();
}
