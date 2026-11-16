import ResourceManager from "../components/ResourceManager";
import { videoApi } from "../api/adminApi";

const fields = [
  { name: "video", type: "video", nameField: "fileName", urlField: "fileUrl", label: "Видео (mp4)" },
  { name: "name", type: "text", label: "Название" },
];

const columns = [{ key: "name", primary: true }];

export default function VideoPage() {
  return <ResourceManager title="Видео" api={videoApi} fields={fields} columns={columns} />;
}
