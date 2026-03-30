import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  };

  const { name, email, subject, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const subjectLine = subject?.trim() || "General Inquiry";

  const body_text = [
    `New contact form submission from GadaaLabs.com`,
    ``,
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Subject: ${subjectLine}`,
    ``,
    `Message:`,
    message,
  ].join("\n");

  const mailtoUrl = `mailto:support@gadaalabs.com?subject=${encodeURIComponent(`[GadaaLabs] ${subjectLine} — from ${name}`)}&body=${encodeURIComponent(body_text)}`;

  return NextResponse.json({ success: true, mailtoUrl });
}
