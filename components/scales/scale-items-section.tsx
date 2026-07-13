import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ScaleItem {
  id: string
  order: number
  text: string
  type: string
  required: boolean
  options: { id: string; label: string; value: number | null }[]
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").toLowerCase()
}

function ItemRow({ item }: { item: ScaleItem }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 w-5 shrink-0 text-xs text-muted-foreground">
        {item.order}.
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{item.text}</p>
        <p className="mt-0.5 text-xs capitalize text-muted-foreground">
          {formatType(item.type)}
          {!item.required && " · optional"}
        </p>
        {item.options.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.options.map((o) => (
              <Badge key={o.id} variant="outline" className="font-normal">
                {o.label}
                {o.value !== null ? ` (${o.value})` : ""}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ScaleItemsSection({ items }: { items: ScaleItem[] }) {
  const useAccordion = items.length > 6

  return (
    <Card className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-4 md:px-6">
        <CardTitle className="text-base">Items</CardTitle>
        <span className="text-xs text-muted-foreground">
          {items.length} question{items.length !== 1 ? "s" : ""}
        </span>
      </CardHeader>

      {items.length === 0 ? (
        <CardContent className="p-4 text-sm text-muted-foreground md:p-6">
          No items configured yet.
        </CardContent>
      ) : useAccordion ? (
        <CardContent className="p-4 md:p-6">
          <Accordion type="multiple" className="w-full">
            {items.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left text-sm hover:no-underline">
                  <span className="line-clamp-1 pr-2">
                    {item.order}. {item.text}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ItemRow item={item} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      ) : (
        <CardContent className="divide-y px-4 md:px-6">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </CardContent>
      )}
    </Card>
  )
}
