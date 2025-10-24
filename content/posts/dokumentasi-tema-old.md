---
title: "Dokumentasi, Formatting dan Styling"
date: 2025-10-19
draft: false
categories: ["Tutorial", "Hugo"]
slug: "dokumentasi-formatting-styling"
# image:
#  src: 'images/dokumentasi.webp'
---

Ajaib Theme adalah tema hugo modern yang dirancang khusus untuk website magazine, blog, dan portal berita. Tema ini dibangun dengan teknologi terkini dan mengutamakan kecepatan, SEO, dan user experience.

{{< details summary="See the details" >}}
This is a **bold** word.
{{< /details >}}

Fitur Utama: Responsif, SEO Optimized, Fast Loading, Customizable, Widget Ready, Translation Ready

## 🔌 Instalasi

Upload tema melalui Blogger **Dashboard** > **Theme** > **Edit Theme** >

Lakukan clean install dengan mereset tema, lalu paste kode tema Gomagz 

## ⚙️ Pengaturan

Blogger > **Layout** > **Edit Pengaturan**

## Elemen Dasar Paragraf & Teks

Ajaib theme mendukung berbagai format teks standar HTML5. Anda dapat menggunakan **teks tebal**, *teks miring*, <u>teks bergaris bawah</u>, dan `inline code`.

Ini adalah paragraf contoh dengan teks tebal dan teks miring.

Anda juga bisa menggunakan [link berwarna](#) yang menarik.

## Daftar

1. Item list pertama
2. Item list kedua
3. Item list ketiga

* Numbered list pertama
* Numbered list kedua
* Numbered list ketiga

## Tabel

|Fitur|Free|Pro|
|-----|----|---|
|Responssive Design|✅|✅|
|SEO Optimized|✅|✅|
|Support|Limited|Full|

## Blok Kode

        function gomagz_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
    register_nav_menus( array(
        'primary' => __( 'Primary Menu', 'gomagz' ),
        ) );}