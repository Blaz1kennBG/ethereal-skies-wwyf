<script lang="ts" setup>
import ListGroupActivator from "@/components/ListGroupActivator.vue";
import { ref, onMounted } from "vue";
import { database, FarmingMaterial, Material } from "../shared/db";
import { CraftingItem } from "../shared/db";
import { cloneDeep } from "lodash-es";
import Header from "@/layouts/default/Header.vue";
interface SelectedItem {
  quantity: number;
  item: CraftingItem;
  materials?: Material[];
  ingredients?: Material[];
}
const searchInput = ref("");
let validForm = false;
const compact = ref(false);
const foundItems = ref([] as CraftingItem[]);
const farmingList = ref([] as SelectedItem[]);
const materialFarmingList = ref([] as FarmingMaterial[]);
const changes = ref(false);
const items = database.getAllItems();

onMounted(() => {
  submit();
});
function submit() {
  const found = items.filter((v) =>
    v.viewValue.toLowerCase().includes(searchInput.value.trim().toLowerCase())
  );

  foundItems.value = found;
}
function addItemToList(item: CraftingItem) {
  const exists = farmingList.value.find((v) => v.item.name === item.name);
  if (exists) {
    updateExisting(exists);
  } else {
    const _item = cloneDeep(item);
    const itemMaterial = [] as any[];
    const itemIngredients = [] as any[];
    _item.materials.map((material, materialIndex) => {
      const craftsAmount = material.craftable_amount
        ? Math.ceil(material.quantity / material.craftable_amount)
        : 1;

      material.ingredients.map((ingredient, ingredientIndex) => {
        const recursiveSetMaterials = (data: Material) => {
          let material_craft_amount;

          material_craft_amount =
            data.craftable_amount && data.quantity
              ? Math.ceil(data.quantity / data.craftable_amount)
              : 1;

          if (!data.quantity || !data.raw) {
            // Keeping this condition in case.
            // Something goes wrong, meaning everytime.
          }
          if (data.quantity && data.raw) {
            // If the ingredient has quantity and raw
            // To remove comment
            /*  data.quantity = data.raw * material_craft_amount;
            data.raw = data.raw * material_craft_amount; */
          }
          // console.log(`Item: `, data, `Crafts: ${material_craft_amount}`);

          data.ingredients.map((mat) => {
            const result = recursiveSetMaterials(mat);
            return {
              ...result,
            };
          });
          let ingredientInList = itemIngredients.find(
            (i) => i.name === data.name && i.type === "ingredients"
          );
          if (ingredientInList) {
            //  console.log("-----------------");
            //  console.log("Before: ", cloneDeep(ingredientInList));
            // To remove comment
            ingredientInList.quantity += data.quantity;
            ingredientInList.raw += data.quantity;
            //  console.log("After: ", cloneDeep(ingredientInList));
            //  console.log("-----------------");
          } else {
            if (data.type === "ingredients") itemIngredients.push(data);
          }

          return data;
        };

        if (ingredient.ingredients?.length) {
          recursiveSetMaterials(ingredient);
        }
        ingredient.quantity = ingredient.raw * craftsAmount;
        ingredient.raw = ingredient.raw * craftsAmount;

        const foundMat = _item.materials.find(
          (v) => v.name === ingredient.name
        ) as any;
        const _craft = Math.ceil(foundMat.quantity / foundMat.craftable_amount);
        if (foundMat.quantity < foundMat.craftable_amount) {
          foundMat.quantity = _craft * foundMat.craftable_amount;

          foundMat.raw = _craft * foundMat.craftable_amount;
        } else {
          foundMat.quantity = ingredient.quantity * _craft;
          foundMat.raw = ingredient.quantity * craftsAmount;
        }

        addItemOrUpdate(itemIngredients, ingredient, "ingredients");

        return {
          ...ingredient,
        };
      });
      addItemOrUpdate(itemMaterial, material, "materials");
      if (material.type === "materials" && material.craftable_amount) {
        const craftable_amount_material = Math.ceil(
          material.quantity / material.craftable_amount
        );

        material.quantity =
          material.craftable_amount * craftable_amount_material;
        material.raw = material.craftable_amount * craftable_amount_material;
      }

      return material;
    });

    const finalItem = {
      quantity: 1,
      item: _item,
      materials: itemMaterial,
      ingredients: itemIngredients,
    };

    farmingList.value.push(finalItem);
    farmingList.value.map((item) => {
      item.materials = item.materials?.sort((a, b) =>
        a.viewValue.localeCompare(b.viewValue)
      );
      item.ingredients = item.ingredients?.sort((a, b) =>
        a.viewValue.localeCompare(b.viewValue)
      );

      return item;
    });
  }

  changes.value = true;
}
function addItemOrUpdate(target: any[], source: any, type: string) {
  let exists = target.find((v) => v.name === source.name && v.type === type);
  if (exists) {
    exists.quantity += source.quantity;
    exists.raw += source.raw;
  } else {
    if (source.type === type) target.push(source);
  }
}
function updateExisting(selectedItem: SelectedItem) {
  selectedItem.quantity++;
  selectedItem.materials?.map((material) => {
    material.quantity = material.raw * selectedItem.quantity;

    return material;
  });
  selectedItem.materials = selectedItem.materials?.sort((a, b) =>
    a.viewValue.localeCompare(b.viewValue)
  );
  selectedItem.ingredients?.map((ingredient) => {
    ingredient.quantity = ingredient.raw * selectedItem.quantity;

    return ingredient;
  });
  selectedItem.ingredients = selectedItem.ingredients?.sort((a, b) =>
    a.viewValue.localeCompare(b.viewValue)
  );
}
function addMaterialsToList(newItem: FarmingMaterial) {
  const exists = materialFarmingList.value.find(
    (v) => v.item.name === newItem.item.name
  );
  if (!exists) {
    materialFarmingList.value.push(newItem);
  } else {
    exists.quantity += newItem.quantity;
  }
  changes.value = false;
}
function generateFarmingMaterialList() {
  materialFarmingList.value = [];
  farmingList.value.forEach((item) => {
    item.ingredients
      ?.sort((a, b) => a.viewValue.localeCompare(b.viewValue))
      .forEach((ingredient) =>
        addMaterialsToList({ quantity: ingredient.quantity, item: ingredient })
      );

    item.materials
      ?.sort((a, b) => a.viewValue.localeCompare(b.viewValue))
      .forEach((material) =>
        addMaterialsToList({ quantity: material.quantity, item: material })
      );
  });
  materialFarmingList.value = materialFarmingList.value.sort((a, b) =>
    a.item.viewValue.localeCompare(b.item.viewValue)
  );
}
function removeItem(selectedItem: SelectedItem) {
  const index = farmingList.value.findIndex(
    (v) => v.item.name === selectedItem.item.name
  );
  if (index !== -1) {
    const newArr = farmingList.value.slice();
    newArr.splice(index, 1);
    farmingList.value = newArr;
  }
  changes.value = true;
}
function clearLists() {
  farmingList.value = [];
  materialFarmingList.value = [];
}
function onSearch(value: string) {
  searchInput.value = value;
  submit();
}
function log(...x: any) {
  console.log(x);
}
</script>

<style>
.v-checkbox .v-input__details {
  display: none;
}
</style>
<template>
  <v-container
    class="h-screen overflow-hidden transition-all duration-500 !p-3 border border-neutral-100"
    :class="{ '!max-w-[100vw]': !compact }"
  >
    <Header @onCompact="() => (compact = !compact)" />
    <v-row>
      <v-col md="12" class="!bg-tw-secondary border border-neutral-100">
        <v-form
          v-model="validForm"
          @submit.prevent="submit"
          class="flex flex-col gap-x-3"
        >
          <v-text-field
            @update:model-value="onSearch($event)"
            v-model="searchInput"
            label="Armor, weapon, accessories...."
          ></v-text-field>
          <div class="flex gap-x-3">
            <v-btn type="submit" variant="tonal">Search</v-btn>
            <v-btn type="button" @click="clearLists()">Clear lists</v-btn>
          </div>
        </v-form>
      </v-col>
    </v-row>
    <v-row class="h-full">
      <v-col
        md="4"
        class="!bg-tw-secondary border border-solid border-neutral-100 overflow-auto !pb-28 h-[90%]"
        >Farming list
        <v-list
          class="!my-2 !p-0 !bg-tw-primary"
          v-for="farmingItem in farmingList"
          :key="farmingItem.item.name"
        >
          <v-list-group class="!bg-tw-primary">
            <template v-slot:activator="{ props, isOpen }">
              <list-group-activator
                :delete-action="true"
                @delete="(ev) => removeItem(farmingItem)"
                :title="`${farmingItem.item.viewValue} (${farmingItem.quantity})`"
                :item-type="farmingItem.item.type"
                :description="
                  farmingItem.item.description || 'Missing item description'
                "
                :props="props"
                :isOpen="isOpen"
              >
                <template v-slot:label-prepend>
                  <div class="flex flex-row gap-x-2 mx-auto items-center">
                    <span
                      data-width="25"
                      data-height="25"
                      class="iconify"
                      data-icon="system-uicons:coins"
                    ></span>
                    <span>{{
                      farmingItem.item.requirements.coins * farmingItem.quantity
                    }}</span>
                  </div>
                </template>
              </list-group-activator>
            </template>
            <div class="mt-2 mb-1 flex flex-row items-center">
              <div class="bg-red-100 h-[2px] flex-1 mx-2"></div>
              <h1 class="uppercase">Materials</h1>
              <div class="bg-red-100 h-[2px] flex-1 mx-2"></div>
            </div>
            <template v-for="(material, i) in farmingItem.materials" :key="i">
              <v-card class="!bg-tw-primary">
                <div class="flex flex-row items-center">
                  <v-checkbox-btn
                    :label="`${material.viewValue} (${material.quantity})`"
                  >
                  </v-checkbox-btn>
                </div>
              </v-card>
            </template>
            <div class="mt-2 mb-1 flex flex-row items-center">
              <div class="bg-red-100 h-[2px] flex-1 mx-2"></div>
              <h1 class="uppercase">Ingredients</h1>
              <div class="bg-red-100 h-[2px] flex-1 mx-2"></div>
            </div>
            <template
              v-for="(ingredient, i) in farmingItem.ingredients"
              :key="i"
            >
              <v-card class="!bg-tw-primary">
                <div class="flex flex-row items-center">
                  <v-checkbox-btn
                    :label="`${ingredient.viewValue} (${ingredient.quantity})`"
                  >
                  </v-checkbox-btn>
                </div>
              </v-card>
            </template>
          </v-list-group>
        </v-list>
      </v-col>
      <v-col
        md="4"
        class="!bg-tw-secondary border border-solid border-neutral-100 overflow-auto !pb-28 h-[90%]"
      >
        Item list
        <v-card
          class="!flex items-center !p-2 !my-2"
          v-for="(item, index) in foundItems"
          v-bind:key="index"
          variant="tonal"
        >
          <span
            data-width="23"
            data-height="23"
            class="iconify"
            :data-icon="item.icon"
          ></span>

          <span class="ml-2">{{ item.viewValue }}</span>
          <v-btn class="ms-auto block" @click="addItemToList(item)">Add</v-btn>
        </v-card>
      </v-col>
      <v-col
        md="4"
        class="!bg-tw-secondary border border-solid border-neutral-100 overflow-auto !pb-28 h-[90%]"
      >
        <v-expansion-panels class="mb-5">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <template v-slot:default
                ><h1 class="text-lg font-semibold">How does it work?</h1>
              </template>
            </v-expansion-panel-title>
            <v-expansion-panel-text class="!p-0">
              <p class="mb-5 leading-7">
                The calculator will show you all the materials and ingredients
                required to 100% craft the item. <br />
                Example: If
                <span class="underline-offset-4 underline">Bone Helmet</span>
                requires 6
                <span class="underline-offset-4 underline">Refined Bone</span>,
                it will calculate the minimum craftable amount of the
                <span class="underline-offset-4 underline">Refined Bone</span>
                and show you that. Currently, Bones are craftable in batch of 8,
                so if item requires 6 Bones, it will show you actual number of
                8. ??he Ingredients tab shows everything you need to craft all
                the materials in the Materials tab <br />
                Leftover materials are expected after crafting the item.
              </p>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <span class="text-lg">All Items to farm</span>
        <div class="grid grid-cols-2 gap-x-3 mt-1">
          <v-btn
            class="w-full"
            variant="flat"
            :color="changes ? 'red' : 'green'"
            @click="generateFarmingMaterialList()"
            >Generate</v-btn
          >
          <v-btn class="w-full" variant="flat" @click="clearLists()"
            >Clear</v-btn
          >
        </div>
        <div class="mt-2 mb-1 flex flex-row items-center">
          <div class="bg-red-100 h-[2px] flex-1 mx-2"></div>
          <h1 class="uppercase">Materials</h1>
          <div class="bg-red-100 h-[2px] flex-1 mx-2"></div>
        </div>
        <v-card
          class="!bg-tw-primary"
          v-for="material in materialFarmingList.filter(
            (v) => v.item.type === 'materials'
          )"
          :key="material.item.name"
        >
          <div class="flex flex-row items-center">
            <v-checkbox-btn
              :label="`${material.item.viewValue} (${material.quantity})`"
            >
            </v-checkbox-btn>
          </div>
        </v-card>
        <div class="mt-2 mb-1 flex flex-row items-center">
          <div class="bg-red-100 h-[2px] flex-1 mx-2"></div>
          <h1 class="uppercase">Ingredients</h1>
          <div class="bg-red-100 h-[2px] flex-1 mx-2"></div>
        </div>
        <v-card
          class="!bg-tw-primary"
          v-for="material in materialFarmingList.filter(
            (v) => v.item.type === 'ingredients'
          )"
          :key="material.item.name"
        >
          <div class="flex flex-row items-center">
            <v-checkbox-btn
              :label="`${material.item.viewValue} (${material.quantity})`"
            >
            </v-checkbox-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
