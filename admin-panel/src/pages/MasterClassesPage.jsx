import ResourceManager from "../components/ResourceManager";
import { masterClassesApi } from "../api/adminApi";

const fields = [
  { name: "name", type: "text", label: "Название", required: true },
  { name: "description", type: "textarea", label: "Описание" },
  { name: "event_date", type: "date", label: "Дата" },
  { name: "link", type: "text", label: "Ссылка на запись", required: true },
  { name: "is_archived", type: "checkbox", label: "Архив", checkboxLabel: "В архиве (не показывать на сайте)" },
  { name: "reviews_enabled", type: "checkbox", label: "Отзывы", checkboxLabel: "Разрешить отзывы" },
];

const columns = [
  {
    key: "name",
    primary: true,
    render: (item) => `${item.name}${item.event_date ? ` · ${item.event_date.slice(0, 10)}` : ""}`,
  },
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

export default function MasterClassesPage() {
  return (
    <ResourceManager title="Мастер-классы" api={masterClassesApi} fields={fields} columns={columns} />
  );
}
