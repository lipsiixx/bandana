import ResourceManager from "../components/ResourceManager";
import { servicesApi } from "../api/adminApi";

const fields = [
  { name: "title", type: "text", label: "Название", required: true },
  { name: "slug", type: "text", label: "Slug (для ссылки /services/slug)", required: true },
  {
    name: "short_description",
    type: "textarea",
    label: "Короткое описание (для карточки в каталоге)",
    required: true,
  },
  { name: "description", type: "textarea", label: "Полное описание (для страницы услуги)" },
  { nameField: "cover_image_url", urlField: "cover_image_url", type: "photo", label: "Обложка" },
  {
    name: "status",
    type: "select",
    label: "Статус",
    options: [
      { value: "active", label: "Активна — можно заказать" },
      { value: "coming_soon", label: "Скоро" },
    ],
  },
  { name: "sort_order", type: "text", label: "Порядок на странице (число, меньше — выше)" },
];

const columns = [
  { key: "title", primary: true, render: (item) => `${item.title} · ${item.slug}` },
  {
    key: "status",
    render: (item) => (
      <span className={`badge sm ${item.status === "active" ? "success" : "neutral"}`}>
        <span className="dot" /> {item.status === "active" ? "Активна" : "Скоро"}
      </span>
    ),
  },
];

export default function ServicesPage() {
  return (
    <ResourceManager
      title="Услуги"
      subtitle="Каталог услуг на сайте — активные услуги можно заказать, «Скоро» просто показываются карточкой."
      api={servicesApi}
      fields={fields}
      columns={columns}
    />
  );
}
