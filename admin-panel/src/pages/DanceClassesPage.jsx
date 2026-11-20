import ResourceManager from "../components/ResourceManager";
import { danceClassesApi } from "../api/adminApi";

const fields = [
  { name: "name", type: "text", label: "Название", required: true },
  { name: "description", type: "textarea", label: "Описание" },
  { name: "is_archived", type: "checkbox", label: "Архив", checkboxLabel: "В архиве (не показывать на сайте)" },
  { name: "reviews_enabled", type: "checkbox", label: "Отзывы", checkboxLabel: "Разрешить отзывы" },
];

const columns = [
  { key: "name", primary: true, render: (item) => item.name },
  {
    key: "is_archived",
    render: (item) => (
      <span className={`badge sm ${item.is_archived ? "purple" : "success"}`}>
        <span className="dot" /> {item.is_archived ? "В архиве" : "На сайте"}
      </span>
    ),
  },
  {
    key: "reviews_enabled",
    render: (item) => (
      <span className={`badge sm ${item.reviews_enabled ? "success" : "neutral"}`}>
        <span className="dot" /> {item.reviews_enabled ? "Отзывы вкл" : "Отзывы выкл"}
      </span>
    ),
  },
];

export default function DanceClassesPage() {
  return (
    <ResourceManager
      title="Занятия"
      subtitle="Регулярные групповые занятия/направления — отдельная категория отзывов."
      api={danceClassesApi}
      fields={fields}
      columns={columns}
    />
  );
}
