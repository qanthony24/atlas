
/**
 * 🛑 DO NOT EDIT MANUALLY 🛑
 * 
 * This file is auto-generated from `openapi.yaml` using `openapi-typescript`.
 * It represents the single source of truth for the API contract.
 * 
 * Run `npm run generate:api` to update.
 */

export interface paths {
  "/me": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["User"];
          };
        };
        401: unknown;
      };
    };
  };
  "/org": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["Organization"];
          };
        };
      };
    };
  };
  "/voters": {
    get: {
      parameters: {
        query: {
          limit?: number;
          offset?: number;
          search?: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["Voter"][];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": Partial<components["schemas"]["Voter"]>;
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["Voter"];
          };
        };
      };
    };
  };
  "/lists": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["WalkList"][];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": {
            name: string;
            voter_ids: string[];
          };
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["WalkList"];
          };
        };
      };
    };
  };
  "/assignments": {
    get: {
      parameters: {
        query: {
          scope?: "me" | "org";
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["Assignment"][];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": {
            list_id: string;
            canvasser_id: string;
          };
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["Assignment"];
          };
        };
      };
    };
  };
  "/interactions": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["Interaction"][];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["InteractionCreate"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["Interaction"];
          };
        };
      };
    };
  };
  "/jobs/import-voters": {
    post: {
      requestBody: {
        content: {
          "application/json": Partial<components["schemas"]["Voter"]>[];
        };
      };
      responses: {
        202: {
          content: {
            "application/json": components["schemas"]["Job"];
          };
        };
      };
    };
  };
  "/jobs/{id}": {
    get: {
      parameters: {
        path: {
          id: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["Job"];
          };
        };
      };
    };
  };
  "/users": {
    get: {
      parameters: {
        query: {
          role?: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["User"][];
          };
        };
      };
    };
  };
  "/users/invite": {
    post: {
      requestBody: {
        content: {
          "application/json": {
            name: string;
            email: string;
            role: string;
          };
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["User"];
          };
        };
      };
    };
  };
  "/auth/switch-role": {
    post: {
      requestBody: {
        content: {
          "application/json": {
            role: "admin" | "canvasser";
          };
        };
      };
      responses: {
        200: {
          description: "Role Switched";
        };
      };
    };
  };
}

export interface components {
  schemas: {
    Organization: {
      id: string;
      name: string;
      status: "active" | "suspended" | "pending_delete";
      plan_id: string;
      limits: {
        [key: string]: number;
      };
      last_activity_at: string;
    };
    User: {
      id: string;
      orgId: string;
      name: string;
      email: string;
      phone: string;
      role: "admin" | "canvasser";
      location?: {
        lat: number;
        lng: number;
      };
    };
    Voter: {
      id: string;
      orgId: string;
      externalId: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      suffix?: string;
      age?: number;
      gender?: string;
      race?: string;
      party?: string;
      phone?: string;
      address: string;
      unit?: string;
      city: string;
      state?: string;
      zip: string;
      geom: {
        lat: number;
        lng: number;
      };
      lastInteractionStatus?: string;
      lastInteractionTime?: string;
    };
    WalkList: {
      id: string;
      orgId: string;
      name: string;
      voterIds: string[];
      createdAt: string;
      createdByUserId: string;
    };
    Assignment: {
      id: string;
      orgId: string;
      listId: string;
      canvasserId: string;
      status: "assigned" | "in_progress" | "completed";
      createdAt: string;
    };
    InteractionCreate: {
      client_interaction_uuid: string;
      org_id: string;
      voter_id: string;
      assignment_id?: string;
      occurred_at: string;
      channel: "canvass";
      result_code: "contacted" | "not_home" | "refused" | "moved" | "inaccessible" | "deceased";
      notes?: string;
      survey_responses?: {
        [key: string]: any;
      };
    };
    Interaction: components["schemas"]["InteractionCreate"] & {
      id: string;
      user_id: string;
    };
    Job: {
      id: string;
      org_id: string;
      user_id: string;
      type: "import_voters" | "export_data";
      status: "pending" | "processing" | "completed" | "failed";
      created_at: string;
      updated_at: string;
      result?: any;
      error?: string;
    };
  };
}
