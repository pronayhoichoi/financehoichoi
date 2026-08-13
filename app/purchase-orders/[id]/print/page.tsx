import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";

// Kept out of the component so the render stays pure (no new Date() in render).
function generatedOn() {
  return format(new Date(), "dd MMM yyyy");
}

export default async function PoPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireView("PO");

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      project: { select: { code: true, title: true, currency: true } },
      vendor: {
        select: {
          legalName: true,
          vendorCode: true,
          gstin: true,
          addressLine: true,
          city: true,
          state: true,
          pincode: true,
        },
      },
      lines: true,
    },
  });
  if (!po) notFound();

  const cur = po.project.currency;
  const money = (n: number) => `${cur} ${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const subtotal = po.lines.reduce((s, l) => s + Number(l.amount), 0);
  const tax = po.lines.reduce((s, l) => s + Number(l.amount) * (Number(l.taxPct ?? 0) / 100), 0);

  return (
    <div className="mx-auto max-w-3xl bg-white px-10 py-10 text-[#191919] print:px-0 print:py-0">
      {/* Brand header */}
      <div className="bg-hc-gradient -mx-10 -mt-10 mb-8 px-10 py-6 print:mx-0 print:mt-0">
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
          Purchase Order
        </div>
        <div className="font-heading text-3xl font-extrabold text-white">hoichoi</div>
      </div>

      <div className="flex justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#888]">PO Number</div>
          <div className="font-mono text-lg font-bold">{po.poNumber}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-[#888]">Date</div>
          <div className="font-mono">{format(po.createdAt, "dd MMM yyyy")}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#888]">Vendor</div>
          <div className="font-semibold">{po.vendor.legalName}</div>
          <div className="text-xs text-[#666]">{po.vendor.vendorCode}</div>
          {po.vendor.addressLine && (
            <div className="text-xs text-[#666]">
              {[po.vendor.addressLine, po.vendor.city, po.vendor.state, po.vendor.pincode]
                .filter(Boolean)
                .join(", ")}
            </div>
          )}
          {po.vendor.gstin.length > 0 && (
            <div className="font-mono text-xs text-[#666]">GSTIN: {po.vendor.gstin[0]}</div>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[#888]">Project</div>
          <div className="font-semibold">{po.project.title}</div>
          <div className="font-mono text-xs text-[#666]">{po.project.code}</div>
          {po.deliveryDate && (
            <div className="mt-2 text-xs text-[#666]">
              Delivery: {format(po.deliveryDate, "dd MMM yyyy")}
            </div>
          )}
        </div>
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-[#191919] text-left">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Rate</th>
            <th className="py-2 text-right">Tax %</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {po.lines.map((l) => (
            <tr key={l.id} className="border-b border-[#eee]">
              <td className="py-2">{l.description}</td>
              <td className="py-2 text-right font-mono">{Number(l.qty)}</td>
              <td className="py-2 text-right font-mono">{money(Number(l.rate))}</td>
              <td className="py-2 text-right font-mono">
                {l.taxPct != null ? `${Number(l.taxPct)}%` : "—"}
              </td>
              <td className="py-2 text-right font-mono">{money(Number(l.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-[#888]">Subtotal</span>
          <span className="font-mono">{money(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#888]">Tax</span>
          <span className="font-mono">{money(tax)}</span>
        </div>
        <div className="flex justify-between border-t border-[#191919] pt-1 font-bold">
          <span>Total</span>
          <span className="font-mono">{money(subtotal + tax)}</span>
        </div>
      </div>

      {po.notes && (
        <p className="mt-6 text-xs text-[#666]">
          <span className="font-semibold">Notes: </span>
          {po.notes}
        </p>
      )}

      <div className="mt-16 flex justify-between text-xs text-[#888]">
        <div>
          <div className="mb-8">Authorised signatory</div>
          <div className="border-t border-[#191919] pt-1">hoichoi Finance</div>
        </div>
        <div className="self-end">Generated {generatedOn()}</div>
      </div>
    </div>
  );
}
