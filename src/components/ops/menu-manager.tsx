"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { ITEM_AVAILABILITY, SPICE_LEVEL, SPICE_LEVEL_LABEL } from "@/lib/domain/enums";
import type { MenuCategory, MenuItem } from "@/lib/domain/types";
import {
  deleteCategory,
  deleteMenuItem,
  saveCategory,
  saveMenuItem,
  setItemAvailability,
} from "@/lib/store/actions";
import { useCategories, useMenuItems } from "@/lib/store/hooks";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Field, Input, SelectField, Textarea, Toggle } from "@/components/ui/field";
import { DishImage, EmptyState, Skeleton } from "@/components/ui/misc";
import {
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTrigger,
  SheetContent,
  SheetRoot,
} from "@/components/ui/sheet";
import { Chip } from "@/components/ui/status-pill";
import { SectionHeading, Surface } from "@/components/ui/surface";
import { HydrationGate } from "@/components/providers";

export function MenuManager() {
  return (
    <HydrationGate fallback={<MenuSkeleton />}>
      <MenuContent />
    </HydrationGate>
  );
}

function MenuContent() {
  // `false` = include hidden categories; management needs to see what guests can't.
  const categories = useCategories(false);
  const items = useMenuItems();

  const [activeCat, setActiveCat] = React.useState<string | null>(null);
  const [editItem, setEditItem] = React.useState<MenuItem | "new" | null>(null);
  const [editCat, setEditCat] = React.useState<MenuCategory | "new" | null>(null);

  const currentCat = activeCat ?? categories[0]?.id ?? null;
  const shown = items.filter((i) => i.categoryId === currentCat);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SectionHeading
        eyebrow="Menu & pricing"
        title="The menu"
        description="Changes reach every guest's phone immediately — no refresh, no republish."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditCat("new")}>
              <Plus className="size-3.5" strokeWidth={1.5} />
              Category
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditItem("new")}>
              <Plus className="size-3.5" strokeWidth={1.5} />
              Dish
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        {/* ── category rail ────────────────────────────────────────────── */}
        <Surface variant="flat" className="h-fit overflow-hidden">
          <ul>
            {categories.map((c) => {
              const count = items.filter((i) => i.categoryId === c.id).length;
              const active = currentCat === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveCat(c.id)}
                    className={cn(
                      "group relative flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0",
                      active ? "bg-surface-3" : "hover:bg-surface-2",
                    )}
                  >
                    {active ? (
                      <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold-400" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm",
                          active ? "text-ink" : "text-ink-2",
                        )}
                      >
                        {c.name}
                      </span>
                      {!c.isActive ? (
                        <Chip tone="danger" className="mt-1">
                          Hidden
                        </Chip>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular text-ink-4">
                      {count}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit ${c.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCat(c);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          setEditCat(c);
                        }
                      }}
                      className="grid size-6 shrink-0 place-items-center rounded-xs text-ink-4 opacity-0 transition-opacity hover:text-gold-300 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Pencil className="size-3" strokeWidth={1.5} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Surface>

        {/* ── items ────────────────────────────────────────────────────── */}
        {shown.length ? (
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {shown.map((item) => {
              const out = item.availability === "out_of_stock";
              return (
                <Surface key={item.id} variant="flat" className="overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <div className="dish-frame relative size-20 shrink-0 rounded-sm">
                      <DishImage
                        src={item.imageUrl}
                        alt={item.name}
                        sizes="80px"
                        className={cn(out && "grayscale opacity-40")}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-md text-ink">
                        {item.name}
                      </p>
                      <p className="mt-0.5 font-mono text-sm tabular text-gold-300">
                        {formatMoney(item.price)}
                      </p>
                      <p className="mt-1 text-xs text-ink-4">
                        {item.prepTimeMinutes} min
                        {item.isSignature ? " · Signature" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditItem(item)}
                      >
                        <Pencil className="size-3.5" strokeWidth={1.5} />
                      </Button>
                      <DeleteItemButton item={item} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-line px-3 py-2">
                    <span
                      className={cn(
                        "text-2xs uppercase tracking-label",
                        out ? "text-danger" : "text-st-available",
                      )}
                    >
                      {out ? "Out of stock" : "Available"}
                    </span>
                    <Toggle
                      checked={!out}
                      onCheckedChange={(on) => {
                        void setItemAvailability(
                          item.id,
                          on ? "available" : "out_of_stock",
                        ).then(() =>
                          toast.success(
                            on
                              ? `${item.name} is back on`
                              : `${item.name} is 86'd`,
                          ),
                        );
                      }}
                    />
                  </div>
                </Surface>
              );
            })}
          </div>
        ) : (
          <Surface variant="flat">
            <EmptyState
              icon={UtensilsCrossed}
              title="Nothing in this section yet."
              action={
                <Button variant="outline" onClick={() => setEditItem("new")}>
                  Add a dish
                </Button>
              }
            />
          </Surface>
        )}
      </div>

      <SheetRoot open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        {editItem ? (
          <SheetContent
            title={editItem === "new" ? "New dish" : "Edit dish"}
            description={
              editItem === "new"
                ? "It appears on the guest menu as soon as you save."
                : editItem.name
            }
            width="lg"
          >
            <ItemForm
              item={editItem === "new" ? null : editItem}
              defaultCategoryId={currentCat}
              onDone={() => setEditItem(null)}
            />
          </SheetContent>
        ) : null}
      </SheetRoot>

      <SheetRoot open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
        {editCat ? (
          <SheetContent
            title={editCat === "new" ? "New category" : "Edit category"}
            description={editCat === "new" ? undefined : editCat.name}
          >
            <CategoryForm
              category={editCat === "new" ? null : editCat}
              onDone={() => setEditCat(null)}
            />
          </SheetContent>
        ) : null}
      </SheetRoot>
    </div>
  );
}

function DeleteItemButton({ item }: { item: MenuItem }) {
  return (
    <DialogRoot>
      <DialogTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Remove ${item.name}`}
          className="hover:text-danger"
        >
          <Trash2 className="size-3.5" strokeWidth={1.5} />
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Remove ${item.name}?`}
        description="It disappears from the guest menu immediately. Orders that already contain it keep their own snapshot, so history stays intact."
      >
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Keep it</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="danger"
              onClick={() => {
                void deleteMenuItem(item.id).then(() =>
                  toast.success(`${item.name} removed`),
                );
              }}
            >
              Remove
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

function ItemForm({
  item,
  defaultCategoryId,
  onDone,
}: {
  item: MenuItem | null;
  defaultCategoryId: string | null;
  onDone: () => void;
}) {
  const categories = useCategories(false);
  const [form, setForm] = React.useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item ? String(item.price / 100) : "",
    categoryId: item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? "",
    imageUrl: item?.imageUrl ?? "",
    prepTimeMinutes: String(item?.prepTimeMinutes ?? 12),
    spiceLevel: item?.spiceLevel ?? "none",
    availability: item?.availability ?? "available",
    isSignature: item?.isSignature ?? false,
  });
  const [busy, setBusy] = React.useState(false);

  const priceValid = /^\d+(\.\d{1,2})?$/.test(form.price.trim());
  const valid = form.name.trim() && priceValid && form.categoryId;

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await saveMenuItem(item?.id ?? null, {
        name: form.name.trim(),
        description: form.description.trim(),
        // Back to integer minor units — floats never enter the domain.
        price: Math.round(parseFloat(form.price) * 100),
        categoryId: form.categoryId,
        imageUrl: form.imageUrl.trim(),
        prepTimeMinutes: Number(form.prepTimeMinutes) || 12,
        spiceLevel: form.spiceLevel as MenuItem["spiceLevel"],
        availability: form.availability as MenuItem["availability"],
        isSignature: form.isSignature,
        ...(item
          ? {}
          : {
              nutrition: null,
              dietTags: [],
              upsellIds: [],
              sortIndex: 99,
            }),
      });
      toast.success(item ? `${form.name} updated` : `${form.name} added`);
      onDone();
    } catch {
      toast.error("Could not save that dish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <Field label="Name">
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Charcoal Lamb Chops"
        />
      </Field>

      <Field label="Description">
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="How would a sommelier describe it?"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Price (₹)"
          error={form.price && !priceValid ? "Numbers only" : undefined}
        >
          <Input
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="1450"
            inputMode="decimal"
          />
        </Field>
        <Field label="Prep time (min)">
          <Input
            value={form.prepTimeMinutes}
            onChange={(e) =>
              setForm({ ...form, prepTimeMinutes: e.target.value })
            }
            inputMode="numeric"
          />
        </Field>
      </div>

      <Field label="Category">
        <SelectField
          ariaLabel="Category"
          value={form.categoryId}
          onValueChange={(v) => setForm({ ...form, categoryId: v })}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>

      <Field label="Spice level">
        <SelectField
          ariaLabel="Spice level"
          value={form.spiceLevel}
          onValueChange={(v) =>
            setForm({ ...form, spiceLevel: v as MenuItem["spiceLevel"] })
          }
          options={SPICE_LEVEL.map((s) => ({
            value: s,
            label: SPICE_LEVEL_LABEL[s],
          }))}
        />
      </Field>

      <Field
        label="Photograph"
        hint="Any https image URL. Leave blank for a plated placeholder."
      >
        <Input
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          placeholder="https://images.unsplash.com/photo-…"
        />
      </Field>

      <Field label="Availability">
        <SelectField
          ariaLabel="Availability"
          value={form.availability}
          onValueChange={(v) =>
            setForm({ ...form, availability: v as MenuItem["availability"] })
          }
          options={ITEM_AVAILABILITY.map((a) => ({
            value: a,
            label: a === "available" ? "Available" : "Out of stock",
          }))}
        />
      </Field>

      <Toggle
        checked={form.isSignature}
        onCheckedChange={(v) => setForm({ ...form, isSignature: v })}
        label="Show in Chef's selection"
      />

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="gold"
          className="flex-1"
          disabled={!valid || busy}
          onClick={save}
        >
          {item ? "Save changes" : "Add dish"}
        </Button>
      </div>
    </div>
  );
}

function CategoryForm({
  category,
  onDone,
}: {
  category: MenuCategory | null;
  onDone: () => void;
}) {
  const [name, setName] = React.useState(category?.name ?? "");
  const [description, setDescription] = React.useState(
    category?.description ?? "",
  );
  const [isActive, setIsActive] = React.useState(category?.isActive ?? true);
  const [busy, setBusy] = React.useState(false);

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await saveCategory(category?.id ?? null, {
        name: name.trim(),
        description: description.trim(),
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        isActive,
        ...(category ? {} : { imageUrl: "", sortIndex: 99 }),
      });
      toast.success(category ? "Category updated" : "Category added");
      onDone();
    } catch {
      toast.error("Could not save that category");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <Field label="Name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Small Plates"
        />
      </Field>
      <Field label="Description" hint="Shown under the heading on the guest menu.">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="To begin — light, sharp, made for sharing."
        />
      </Field>
      <Toggle
        checked={isActive}
        onCheckedChange={setIsActive}
        label="Visible to guests"
      />

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="gold"
          className="flex-1"
          disabled={!name.trim() || busy}
          onClick={save}
        >
          {category ? "Save changes" : "Add category"}
        </Button>
      </div>

      {category ? (
        <div className="border-t border-line pt-4">
          <DialogRoot>
            <DialogTrigger asChild>
              <Button variant="danger" className="w-full">
                <Trash2 className="size-4" strokeWidth={1.5} />
                Remove category and its dishes
              </Button>
            </DialogTrigger>
            <DialogContent
              title={`Remove ${category.name}?`}
              description="Every dish in this section is removed from the guest menu along with it. Existing orders keep their own snapshots."
            >
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">Keep it</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="danger"
                    onClick={() => {
                      void deleteCategory(category.id).then(() => {
                        toast.success(`${category.name} removed`);
                        onDone();
                      });
                    }}
                  >
                    Remove everything
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </DialogRoot>
        </div>
      ) : null}
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-40" />
      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <Skeleton className="h-80 rounded-md" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
