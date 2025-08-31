# The model's entry point script for SageMaker
import os
import io
import json
import torch
from PIL import Image
from torchvision.transforms import functional as F

# You MUST include a copy of your model definition here
# For example, in a file named model_definition.py
from model_definition import get_model as get_your_model

def model_fn(model_dir):
    """
    Loads the PyTorch model from the model directory.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Instantiate your model class
    # The number of classes should be based on your model's training
    num_classes = 11  # 10 skin conditions + 1 for background
    model = get_your_model(num_classes)

    # Load the state dict (weights only)
    model_path = os.path.join(model_dir, 'model.pth')
    model.load_state_dict(torch.load(model_path, map_location=device))
    
    model.to(device).eval()
    return model

def input_fn(request_body, request_content_type):
    """
    Deserializes the incoming image bytes.
    """
    if request_content_type == 'image/jpeg':
        # Convert the incoming image bytes to a PyTorch tensor
        input_image = Image.open(io.BytesIO(request_body)).convert("RGB")
        image_tensor = F.to_tensor(input_image)
        return image_tensor
    
    raise ValueError(f"Unsupported content type: {request_content_type}")

def predict_fn(input_object, model):
    """
    Performs the prediction on the preprocessed input.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    with torch.no_grad():
        # The model expects a list of tensors
        output = model([input_object.to(device)])
        
    # output[0] contains the dictionary of predictions
    return output[0]

def output_fn(prediction, accept_type):
    """
    Serializes the prediction result to JSON.
    """
    if accept_type == 'application/json':
        boxes = prediction['boxes'].cpu().numpy().tolist()
        scores = prediction['scores'].cpu().numpy().tolist()
        labels = prediction['labels'].cpu().numpy().tolist()

        results = []
        for i in range(len(boxes)):
            # Filter detections by a confidence threshold
            if scores[i] > 0.3:
                results.append({
                    "box": [round(b, 2) for b in boxes[i]],
                    "label_id": int(labels[i]),
                    "confidence": round(scores[i], 4)
                })
        
        return json.dumps({"predictions": results})
    
    raise ValueError(f"Unsupported accept type: {accept_type}")