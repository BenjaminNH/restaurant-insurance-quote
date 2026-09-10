"use client";

import { resolveSalesContact } from "@/config/sales-contacts";
import { useSearchParams } from "next/navigation";
import { SalesContactAction } from "./sales-contact-action";

export function SalesContactResolver() {
  const searchParams = useSearchParams();

  return <SalesContactAction contact={resolveSalesContact(searchParams.get("ref"))} />;
}
