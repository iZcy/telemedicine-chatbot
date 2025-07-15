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
      name: "Admin User",
      role: "ADMIN",
      password: hashedPassword
    }
  });

  // Sample knowledge entries
  const knowledgeEntries = [
    {
      title: "Common Cold Symptoms",
      content:
        "Common cold symptoms include runny or stuffy nose, sore throat, cough, sneezing, and mild fatigue. Symptoms typically last 7-10 days. Rest, fluids, and over-the-counter medications can help manage symptoms. Consult a healthcare provider if symptoms worsen or persist beyond 10 days.",
      category: "symptoms",
      keywords: ["cold", "runny nose", "sore throat", "cough", "sneezing"],
      tags: ["respiratory", "viral"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Fever Management",
      content:
        "Fever is a body temperature above 100.4°F (38°C). For mild fevers, rest and fluids are recommended. Over-the-counter medications like acetaminophen or ibuprofen can help reduce fever. Seek immediate medical attention if fever exceeds 103°F (39.4°C), is accompanied by severe symptoms, or lasts more than 3 days.",
      category: "symptoms",
      keywords: [
        "fever",
        "temperature",
        "high fever",
        "acetaminophen",
        "ibuprofen"
      ],
      tags: ["general", "temperature"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Headache Types and When to Seek Help",
      content:
        "Headaches can be tension-type, migraine, or cluster headaches. Most headaches are benign and can be managed with rest, hydration, and over-the-counter pain relievers. Seek immediate medical attention for sudden severe headaches, headaches with fever and stiff neck, headaches after head injury, or headaches with vision changes.",
      category: "symptoms",
      keywords: ["headache", "migraine", "tension headache", "severe headache"],
      tags: ["neurological", "pain"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: false,
      createdBy: admin.id
    },
    {
      title: "Chest Pain - Emergency Warning Signs",
      content:
        "Chest pain can have many causes. SEEK IMMEDIATE EMERGENCY CARE if chest pain is accompanied by: shortness of breath, sweating, nausea, pain radiating to arm/jaw/back, or feeling of impending doom. These could be signs of a heart attack. Do not drive yourself - call emergency services.",
      category: "emergency",
      keywords: [
        "chest pain",
        "heart attack",
        "emergency",
        "shortness of breath"
      ],
      tags: ["cardiac", "emergency"],
      confidenceLevel: "HIGH",
      medicalReviewed: true,
      requiresEscalation: true,
      createdBy: admin.id
    },
    {
      title: "Healthy Diet Basics",
      content:
        "A healthy diet includes a variety of fruits, vegetables, whole grains, lean proteins, and healthy fats. Aim for 5-9 servings of fruits and vegetables daily, limit processed foods, reduce sodium intake, and stay hydrated with plenty of water. Consult a nutritionist for personalized dietary advice.",
      category: "general",
      keywords: ["diet", "nutrition", "healthy eating", "fruits", "vegetables"],
      tags: ["nutrition", "prevention"],
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

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
