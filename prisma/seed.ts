// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Administrator",
      role: "ADMIN",
      password: hashedPassword
    }
  });

  // Indonesian medical knowledge entries
  const knowledgeEntries = [
    {
      title: "Gejala Flu Biasa",
      content:
        "Gejala flu biasa meliputi hidung tersumbat atau berair, sakit tenggorokan, batuk, bersin, dan kelelahan ringan. Gejala biasanya berlangsung 7-10 hari. Istirahat yang cukup, minum banyak cairan, dan obat bebas dapat membantu mengatasi gejala. Konsultasikan dengan dokter jika gejala memburuk atau berlangsung lebih dari 10 hari.",
      category: "gejala",
      keywords: [
        "flu",
        "hidung tersumbat",
        "sakit tenggorokan",
        "batuk",
        "bersin",
        "pilek"
      ],
      tags: ["pernapasan", "virus"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Penanganan Demam",
      content:
        "Demam adalah suhu tubuh di atas 37,8°C. Untuk demam ringan, disarankan istirahat dan minum banyak cairan. Obat penurun demam seperti paracetamol atau ibuprofen dapat membantu. Segera cari bantuan medis jika demam melebihi 39,4°C, disertai gejala berat, atau berlangsung lebih dari 3 hari.",
      category: "gejala",
      keywords: [
        "demam",
        "suhu tubuh",
        "demam tinggi",
        "paracetamol",
        "ibuprofen",
        "panas"
      ],
      tags: ["umum", "suhu"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Jenis Sakit Kepala dan Kapan Harus Mencari Bantuan",
      content:
        "Sakit kepala dapat berupa sakit kepala tegang, migrain, atau sakit kepala cluster. Sebagian besar sakit kepala jinak dan dapat diatasi dengan istirahat, hidrasi, dan obat pereda nyeri bebas. Segera cari bantuan medis untuk sakit kepala mendadak yang parah, sakit kepala dengan demam dan kaku leher, sakit kepala setelah cedera kepala, atau sakit kepala dengan perubahan penglihatan.",
      category: "gejala",
      keywords: [
        "sakit kepala",
        "migrain",
        "sakit kepala tegang",
        "sakit kepala parah"
      ],
      tags: ["neurologi", "nyeri"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Nyeri Dada - Tanda Bahaya Darurat",
      content:
        "Nyeri dada dapat memiliki berbagai penyebab. SEGERA CARI BANTUAN DARURAT jika nyeri dada disertai dengan: sesak napas, berkeringat, mual, nyeri yang menjalar ke lengan/rahang/punggung, atau perasaan akan pingsan. Ini bisa jadi tanda serangan jantung. Jangan mengemudi sendiri - panggil layanan darurat.",
      category: "darurat",
      keywords: [
        "nyeri dada",
        "serangan jantung",
        "darurat",
        "sesak napas",
        "jantung"
      ],
      tags: ["jantung", "darurat"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: true,
      createdBy: admin.id
    },
    {
      title: "Dasar-dasar Pola Makan Sehat",
      content:
        "Pola makan sehat meliputi berbagai macam buah, sayuran, biji-bijian utuh, protein tanpa lemak, dan lemak sehat. Targetkan 5-9 porsi buah dan sayuran per hari, batasi makanan olahan, kurangi asupan garam, dan tetap terhidrasi dengan banyak minum air. Konsultasikan dengan ahli gizi untuk saran diet yang dipersonalisasi.",
      category: "umum",
      keywords: ["diet", "nutrisi", "makan sehat", "buah", "sayuran"],
      tags: ["nutrisi", "pencegahan"],
      confidenceLevel: "MEDIUM",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Gejala COVID-19 dan Pencegahan",
      content:
        "Gejala COVID-19 meliputi demam, batuk kering, sesak napas, kelelahan, nyeri otot, sakit tenggorokan, dan hilangnya indera penciuman atau perasa. Pencegahan meliputi vaksinasi, memakai masker, menjaga jarak, mencuci tangan, dan menghindari kerumunan. Lakukan tes jika mengalami gejala dan isolasi jika positif.",
      category: "penyakit",
      keywords: ["covid", "corona", "virus", "vaksin", "masker", "isolasi"],
      tags: ["virus", "pencegahan", "pandemi"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Pertolongan Pertama untuk Luka Bakar",
      content:
        "Untuk luka bakar ringan: segera dinginkan dengan air mengalir selama 10-20 menit, jangan gunakan es, oleskan gel lidah buaya, dan tutup dengan perban steril. Untuk luka bakar berat: jangan lepaskan pakaian yang menempel, segera cari bantuan medis. Hindari mentega, pasta gigi, atau obat rumahan lainnya.",
      category: "pertolongan_pertama",
      keywords: ["luka bakar", "air dingin", "pertolongan pertama", "bakar"],
      tags: ["darurat", "pertolongan_pertama"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Mengatasi Diare",
      content:
        "Diare adalah buang air besar cair lebih dari 3 kali sehari. Penanganan meliputi: minum banyak cairan untuk mencegah dehidrasi, konsumsi oralit, makan makanan hambar seperti nasi putih, pisang, roti panggang. Hindari susu, makanan berlemak, dan makanan pedas. Segera ke dokter jika diare berlangsung lebih dari 2 hari, disertai darah, atau tanda dehidrasi berat.",
      category: "gejala",
      keywords: ["diare", "mencret", "dehidrasi", "oralit", "perut"],
      tags: ["pencernaan", "dehidrasi"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Cara Mengatasi Insomnia",
      content:
        "Insomnia adalah kesulitan tidur atau mempertahankan tidur. Tips mengatasi: buat jadwal tidur yang teratur, hindari kafein dan alkohol sebelum tidur, ciptakan lingkungan tidur yang nyaman, batasi penggunaan gadget, dan lakukan relaksasi. Jika insomnia berlanjut lebih dari 2 minggu, konsultasikan dengan dokter.",
      category: "gejala",
      keywords: ["insomnia", "susah tidur", "tidur", "begadang"],
      tags: ["tidur", "mental"],
      confidenceLevel: "MEDIUM",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Penanganan Hipertensi",
      content:
        "Hipertensi atau tekanan darah tinggi (>140/90 mmHg) perlu dikelola dengan baik. Penanganan meliputi: diet rendah garam, olahraga teratur, menjaga berat badan ideal, tidak merokok, batasi alkohol, kelola stres, dan minum obat sesuai resep dokter. Kontrol rutin ke dokter untuk monitoring tekanan darah.",
      category: "penyakit",
      keywords: ["hipertensi", "tekanan darah tinggi", "tensi", "darah tinggi"],
      tags: ["jantung", "kronis"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Gejala dan Penanganan Diabetes",
      content:
        "Gejala diabetes meliputi: sering haus, sering buang air kecil, mudah lapar, penurunan berat badan, kelelahan, dan luka yang sulit sembuh. Penanganan meliputi: diet sehat, olahraga teratur, monitoring gula darah, minum obat sesuai resep, dan kontrol rutin ke dokter. Komplikasi dapat dicegah dengan kontrol gula darah yang baik.",
      category: "penyakit",
      keywords: ["diabetes", "gula darah", "insulin", "kencing manis"],
      tags: ["metabolik", "kronis"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Pertolongan Pertama Tersedak",
      content:
        "Jika seseorang tersedak dan tidak bisa bicara atau bernapas: berikan 5 pukulan di punggung dengan telapak tangan, lalu lakukan manuver Heimlich (dorong perut ke atas dan ke dalam). Untuk bayi: balikkan tubuh, berikan 5 pukulan di punggung, lalu 5 dorongan dada. Segera panggil bantuan medis jika objek tidak keluar.",
      category: "pertolongan_pertama",
      keywords: ["tersedak", "heimlich", "pertolongan pertama"],
      tags: ["darurat", "pertolongan_pertama"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: true,
      createdBy: admin.id
    },
    {
      title: "Mengatasi Asma",
      content:
        "Asma adalah kondisi kronis yang menyebabkan sesak napas, mengi, dan batuk. Penanganan meliputi: hindari pemicu (debu, asap, alergen), gunakan inhaler sesuai petunjuk dokter, jaga kebersihan lingkungan, dan buat rencana penanganan asma. Segera ke IGD jika mengalami serangan asma berat atau inhaler tidak membantu.",
      category: "penyakit",
      keywords: ["asma", "sesak napas", "mengi", "inhaler"],
      tags: ["pernapasan", "kronis"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Pencegahan dan Penanganan Stroke",
      content:
        "Tanda-tanda stroke (FAST): Face (wajah turun), Arms (lengan lemah), Speech (bicara pelo), Time (waktu kritis). Pencegahan: kontrol tekanan darah, kolesterol, gula darah, tidak merokok, olahraga teratur, diet sehat. Jika curiga stroke, segera ke rumah sakit dalam 3 jam pertama untuk hasil optimal.",
      category: "darurat",
      keywords: ["stroke", "fast", "lumpuh", "bicara pelo"],
      tags: ["neurologi", "darurat"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: true,
      createdBy: admin.id
    },
    {
      title: "Mengatasi Kecemasan dan Stres",
      content:
        "Kecemasan dan stres dapat diatasi dengan: teknik pernapasan dalam, meditasi, olahraga teratur, tidur yang cukup, batasi kafein, berbagi dengan orang terdekat, dan aktivitas yang menenangkan. Jika kecemasan mengganggu aktivitas sehari-hari, konsultasikan dengan psikolog atau psikiater.",
      category: "mental",
      keywords: ["cemas", "stres", "khawatir", "gelisah", "panik"],
      tags: ["mental", "psikologi"],
      confidenceLevel: "MEDIUM",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    }
  ];

  for (const entry of knowledgeEntries) {
    const createdEntry = await prisma.knowledgeEntry.create({
      data: entry
    });

    // Create initial version for each entry
    await prisma.knowledgeVersion.create({
      data: {
        entryId: createdEntry.id,
        content: entry.content,
        version: 1,
        createdBy: admin.id
      }
    });
  }

  console.log("Database berhasil di-seed dengan data Indonesia!");
  console.log(
    `Berhasil membuat ${knowledgeEntries.length} entri pengetahuan medis`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
