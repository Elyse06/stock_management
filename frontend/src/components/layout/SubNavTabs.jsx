import { NavLink } from "react-router-dom";
import { Box, Tab, Tabs } from "@mui/material";

/** Onglets des sous-pages de la rubrique active. */
export function SubNavTabs({ parent, activeChild }) {
  const index = parent.children.indexOf(activeChild);
  return (
    <Box sx={{ bgcolor: "#FAFAFA", borderBottom: "1px solid #E0E0E0", px: 2 }}>
      <Tabs
        value={index === -1 ? false : index}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 40, "& .MuiTabs-indicator": { backgroundColor: "secondary.main", height: 3 } }}
      >
        {parent.children.map(({ path, label, Icon }) => (
          <Tab
            key={path}
            component={NavLink}
            to={path}
            end
            icon={<Icon fontSize="small" />}
            iconPosition="start"
            label={label}
            sx={{
              minHeight: 40,
              textTransform: "none",
              color: "text.secondary",
              fontSize: 13,
              fontWeight: 500,
              px: 2,
              "&.Mui-selected": { color: "primary.main", fontWeight: 600 },
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
