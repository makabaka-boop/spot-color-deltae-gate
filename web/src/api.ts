import type {
  DeltaEErrorResponse,
  DeltaESuccessResponse,
} from "./types";

export type ApiOutcome =
  | { ok: true; data: DeltaESuccessResponse }
  | { ok: false; status: number; error: DeltaEErrorResponse | null };

/** 调用 /api/delta-e；网络层错误同样按“整次拒绝”处理。 */
export async function postDeltaE(payload: unknown): Promise<ApiOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/delta-e", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: {
        ok: false,
        message: "无法连接计算服务，请确认 API 已启动",
        errors: [{ field: "network", message: "网络请求失败" }],
      },
    };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.ok && body && typeof body === "object" && (body as DeltaESuccessResponse).ok === true) {
    return { ok: true, data: body as DeltaESuccessResponse };
  }
  return {
    ok: false,
    status: res.status,
    error: body as DeltaEErrorResponse | null,
  };
}
