export const metadata = {
  title: "Быстрый заказ — Перекрёсток",
  description: "Сфотографируйте холодильник — ИИ соберёт заказ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
