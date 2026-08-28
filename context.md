# Price Feed CMS - Context & Spec

## Project Overview
โปรเจกต์นี้เป็น **Dashboard & CMS** สำหรับให้แอดมินหรือผู้ใช้งานดูราคาสินทรัพย์แบบ Real-time และในอนาคตจะใช้สำหรับจัดการรายชื่อสินทรัพย์ (Asset Management)

## Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: TailwindCSS
- **Icons**: lucide-react
- **Realtime Client**: Firebase Web SDK (`firebase/database`)

## Features & UI Design
- **Live Price Monitor** (`src/app/page.tsx`): 
  - ดึงข้อมูลจาก Firebase Realtime Database (`price/`) แบบ Real-time
  - **Connection Status**: มีแถบสถานะ (Badge) แสดงการเชื่อมต่อกับ Firebase และ Backend (`/api/settings/sync-toggles`) แบบ Real-time
  - **Animation**: มี Component `PriceTicker` (PriceDisplay) ที่จำราคาเก่าไว้ หากราคาใหม่สูงกว่าเดิมตัวเลขจะกระพริบ **สีเขียวแบบเรืองแสง (Glow)** และหากต่ำกว่าจะกระพริบ **สีแดงแบบเรืองแสง**
  - **Sync Controls**: มีระบบปุ่มเปิด/ปิดการดึงราคาแบบ Global และแยกตาม Category
  - **Manual Mode**: เมื่อปิด Auto-sync ตัวเลขราคาจะเปลี่ยนเป็นช่อง Input ให้อัปเดตข้อมูลด้วยตัวเอง (กด Enter เพื่อ Save)
  - **Force Sync**: ปุ่มกดให้ดึงข้อมูลทันที (ทำงานเบื้องหลัง) แบบแยกส่วน (All / Category / Asset)
  - **Last Updated**: แสดงเวลาอัปเดตราคาล่าสุดทั้งระดับตลาด (Market) และแยกรายตัว (Asset)

## Folder Structure & Key Files
- `src/lib/firebase.ts`: การตั้งค่า Firebase Client (Web Config)
- `src/app/page.tsx`: หน้า Dashboard หลักที่มี UI ดึงข้อมูลราคา
- `src/app/globals.css`: ไฟล์ CSS หลัก ที่มีการตั้งค่า Tailwind Theme ตัวแปรสี และ `@keyframes` สำหรับทำ Animation กระพริบ (`flash-green`, `flash-red`)

## Environments (Dev/Prod)
- **Configuration**: ใช้ฟีเจอร์ Environment Variables ของ Next.js
- **Dev**: โหลดไฟล์ `.env.development` อัตโนมัติเมื่อรัน `npm run dev` (เชื่อมต่อ Firebase `wealth-sphere-app`)
- **Prod**: โหลดไฟล์ `.env.production` อัตโนมัติเมื่อทำการ build และ start สำหรับ Production (เชื่อมต่อ Firebase `wealth-sphere-prod`)
- **Firebase/API Setup**: การตั้งค่า Firebase Web SDK (รวมถึง `databaseURL` และค่าคอนฟิกอื่นๆ) รวมไปถึง `NEXT_PUBLIC_API_URL` จะถูกดึงมาจากไฟล์ `.env` ของแต่ละฝั่ง เพื่อสลับ Environment ได้อย่างปลอดภัย

## Current Status (Last Updated)
- [x] Setup Next.js + Tailwind
- [x] เชื่อมต่อ Firebase Web SDK สำเร็จ
- [x] สร้างหน้า Dashboard แสดงผลราคาแยกตาม Market และทำ Animation สำเร็จ
- [x] สร้างหน้า UI สำหรับ Asset Management เพื่อเรียกใช้ REST API ของ Go Backend (`/assets`)
- [x] สร้างระบบเปิด/ปิดการ Sync, Manual Mode สำหรับอัปเดตราคา, และปุ่ม Force Sync ทันที
- [x] แยก Environment (Dev/Prod) และใช้ `.env` แยกตาม Environment สำเร็จ
