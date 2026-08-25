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
  - **Animation**: มี Component `PriceTicker` ที่จำราคาเก่าไว้ หากราคาใหม่สูงกว่าเดิมตัวเลขจะกระพริบ **สีเขียวแบบเรืองแสง (Glow)** และหากต่ำกว่าจะกระพริบ **สีแดงแบบเรืองแสง**
- **UI Aesthetics**: เน้นความ Premium (Dark mode, Glassmorphism, Smooth gradients)

## Folder Structure & Key Files
- `src/lib/firebase.ts`: การตั้งค่า Firebase Client (Web Config)
- `src/app/page.tsx`: หน้า Dashboard หลักที่มี UI ดึงข้อมูลราคา
- `src/app/globals.css`: ไฟล์ CSS หลัก ที่มีการตั้งค่า Tailwind Theme ตัวแปรสี และ `@keyframes` สำหรับทำ Animation กระพริบ (`flash-green`, `flash-red`)

## Current Status (Last Updated)
- [x] Setup Next.js + Tailwind
- [x] เชื่อมต่อ Firebase Web SDK สำเร็จ
- [x] สร้างหน้า Dashboard แสดงผลราคาแยกตาม Market และทำ Animation สำเร็จ
- [x] สร้างหน้า UI สำหรับ Asset Management เพื่อเรียกใช้ REST API ของ Go Backend (`/assets`)
