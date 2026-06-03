/* START: THIS SECTION CODE IS CANNOT BE CHANGED, YOU ONLY READ IT */
export interface FieldSchemaType {
  fieldName?: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "color"
    | "url"
    | "enum"
    | "datetime"
    | "file"
    | "files";
  required?: boolean;
  label?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
  fields?: FieldSchemaType[];
  item?: FieldSchemaType;
}
/* END: THIS SECTION CODE IS CANNOT BE CHANGED, YOU ONLY READ IT */

export type ConfigurableSchemas = {
  formSchema: FieldSchemaType[];
};



export const configurableSchemas: ConfigurableSchemas = {
  formSchema: [
    {
      fieldName: "appName",
      type: "string",
      required: true,
      label: "Game Title",
    },
    {
      fieldName: "logoUrl",
      type: "url",
      required: true,
      label: "Logo URL",
    },
    {
      fieldName: "brandColor",
      type: "object",
      required: true,
      label: "Brand Color",
      fields: [
        {
          fieldName: "primary",
          type: "color",
          required: true,
          label: "Primary (Hero Glow)",
        },
        {
          fieldName: "secondary",
          type: "color",
          required: true,
          label: "Secondary (Foreground)",
        },
        {
          fieldName: "accent",
          type: "color",
          required: true,
          label: "Accent (Highlights)",
        },
      ],
    },
    {
      fieldName: "tagline",
      type: "string",
      required: false,
      label: "Game Tagline",
    },
    {
      fieldName: "startPrompt",
      type: "string",
      required: false,
      label: "Start Prompt Text",
    },
    {
      fieldName: "controlsHint",
      type: "string",
      required: false,
      label: "Controls Hint",
    },
    {
      fieldName: "skyColor",
      type: "color",
      required: false,
      label: "Sky / Far Background Color",
    },
    {
      fieldName: "midBackgroundColor",
      type: "color",
      required: false,
      label: "Mid Background Color",
    },
    {
      fieldName: "groundColor",
      type: "color",
      required: false,
      label: "Ground / Platform Color",
    },
    {
      fieldName: "coinColor",
      type: "color",
      required: false,
      label: "Coin Color",
    },
    {
      fieldName: "gemColor",
      type: "color",
      required: false,
      label: "Gem Color",
    },
    {
      fieldName: "enemyColor",
      type: "color",
      required: false,
      label: "Enemy Color",
    },
    {
      fieldName: "enableMusic",
      type: "boolean",
      required: false,
      label: "Enable Background Music",
    },
    {
      fieldName: "enableSfx",
      type: "boolean",
      required: false,
      label: "Enable Sound Effects",
    },
    {
      fieldName: "winMessage",
      type: "string",
      required: false,
      label: "Win Screen Message",
    },
    {
      fieldName: "creditsText",
      type: "string",
      required: false,
      label: "Credits / Footer Text",
    },
  ],
};
