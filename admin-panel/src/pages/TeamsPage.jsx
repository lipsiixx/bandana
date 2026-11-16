import ResourceManager from "../components/ResourceManager";
import { teamsApi } from "../api/adminApi";

const fields = [
  { name: "photo", type: "photo", nameField: "fileName", urlField: "fileUrl", label: "Фото" },
  { name: "name", type: "text", label: "Название команды", required: true },
  { name: "city", type: "text", label: "Город", required: true },
  { name: "ageRange", type: "text", label: "Возраст участников" },
  { name: "instructors", type: "text", label: "Преподаватели" },
  { name: "choreographer", type: "text", label: "Хореограф" },
  { name: "achievements", type: "list", label: "Достижения (каждое с новой строки)" },
  { name: "description", type: "textarea", label: "Описание" },
  { name: "isRecruiting", type: "checkbox", label: "Набор", checkboxLabel: "Открыт набор" },
];

const columns = [
  { key: "name", primary: true, render: (item) => `${item.name}${item.city ? ` · ${item.city}` : ""}` },
  {
    key: "isRecruiting",
    render: (item) => (
      <span className={`badge sm ${item.isRecruiting ? "success" : "neutral"}`}>
        <span className="dot" /> {item.isRecruiting ? "Набор открыт" : "Набор закрыт"}
      </span>
    ),
  },
];

export default function TeamsPage() {
  return <ResourceManager title="Команды" api={teamsApi} fields={fields} columns={columns} />;
}
