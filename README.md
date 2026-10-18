# Concord Engineering Exercise — TJ's Submission
<img width="1256" height="797" alt="image" src="https://github.com/user-attachments/assets/be8f9da3-1af4-443d-bc53-31b66f8bd6b3" />

## Notes

Per our in-person discussion, some assumptions include:
- The user is a visa advisor managing their workload
  - Therefore we're not concerned with completed visas, or cases that otherwise don't require filing in the future
- This particular user sees the caseload for others as well, as a lead of some sort.

All changes follow from these base assumptions. 

I split the data into "Completed work" and "Pending Work" panels, adding semantic tags to flag and categorize work. I also pared down the information displayed, with cases no longer needing work relegated to a different tab​. The card at the top now reads how many high-priority tags there are, instead of a total case number.

Given more time, I'd like to implement the full redesign and see how it feels.

## Running it

Two commands:

```bash
bun install
bun run dev
```

Then open the printed `localhost` URL. 
