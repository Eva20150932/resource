"""
作者：Eva20150932（知乎/CSDN/github）
本文仅用于model soup(yolov5)实现参考，不提供模型权重及相应训练数据，请自行训练。
在MIT license下分享本代码。
注1：str2model为内部使用，类timm，用于获取模型。
注2：fast字典用于快速跳过已知评分模型的再次评测。
注3：请努力自己读懂代码，因为作者也不记得写了些什么。
"""


import os
from pyclbr import Function
import sys
import torch
import torch.nn as nn
import datetime,time
import numpy as np
from copy import deepcopy

advanced = '/datalab/my_project/advanced'
sys.path.append(advanced)
# print(sys.path)
from nets.nets_manager import str2model


_parent_dir = 'soup_test'
_labels_dir = os.path.join(_parent_dir, 'labels')
_imgs_dir = os.path.join(_parent_dir, 'images')
_weights_dir = os.path.join(_parent_dir, 'hyper')
_output_path = os.path.join(_parent_dir, 'output.pt')

_mode = 'full'  # avg：平均，  greedy：从最优模型开始贪心，   full：测试所有贪婪汤可能

fast={
    '1.pt':0.7365977465282374,
    '2.pt':0.7513323222784163,
    '3.pt':0.7106948859910003,
    '4.pt':0.6979945548499331,
    '5.pt':0.7395609215608485,
    '6.pt':0.7767386954450526,
    '7.pt':0.7909286005845204,
    '8.pt':0.8034624305103252,

    'best_n_25.pt':0.8346245379759357,
    'best_n_50.pt':0.8228537919441742,
    'best_n_80.pt':0.8350304221040309,
    'best_n_10.pt':0.6900943067373534,

    '60.pt':0.7106948859910003,
    '20.pt':0.2079210936325654,
    '40.pt':0.43587140102241617,
    '80.pt':0.767639864293186,

    'adam_mixup_10.pt':     0.8301080850152868,
    'adamw_mixup_05.pt':    0.8006425789639522,
    'sgd_mixup_10.pt':      0.8364609118651627,
    'adamw.pt':             0.8110609474727709,
    'adamw_mixup_10.pt':    0.8696864861968511,
    'adam.pt':              0.8380430846761685,
    'sgd.pt':               0.8199147282214774,
    'sgd_mixup_05.pt':      0.8120996535197279,
    'adam_mixup_05.pt':     0.8054051591340733,

}
fast_flag=True

def soup(typeName:str,clsName:str,args:dict, score_func:Function,save_func:Function, \
         mode=_mode,weights={}, weights_dir=_weights_dir, \
         output_path=_output_path, imgs_dir=_imgs_dir, labels_dir=_labels_dir):
    """
    对pytorch模型进行融合。参数model只提供结构不提供权重。
    """

    li = os.listdir(weights_dir)
    li = list(filter(lambda x: x.endswith('pt') or x.endswith('pth'),li))
    print(li)
    if len(li) == 0:
        raise Exception('无权重可融合')
        
    args['weights_path']=os.path.join(weights_dir, li[0])
    model=str2model(typeName,clsName,args)
    net = model
    if hasattr(model, 'model'):
        net = model.model
    if hasattr(model, 'net'):
        net = model.net
    if net.__class__.__base__ != nn.Module:
        raise Exception('非pytorch模型，此方法无法进行权重融合')

    a=net.state_dict()
    b=net.state_dict()

    weights=[]
    # t=score_func(model)
    if fast_flag and li[0] in fast:
        t=fast[li[0]]
    else:
        t=score_func(model)
    weights.append((net.state_dict(),t,li[0]))
    print(f'{li[0]}的得分：',t)
    for i in range(1,len(li)):
        pat=os.path.join(weights_dir, li[i])
        args['weights_path']=pat
        tmodel=str2model(typeName,clsName,args)
        tnet=tmodel
        if hasattr(tmodel, 'model'):
            tnet =tmodel.model
        if hasattr(tmodel, 'net'):
            tnet = tmodel.net
            
        if tnet.state_dict().keys()!=weights[0][0].keys():
            raise Exception(f'不同模型！{li[0]}与{li[i]}')

        if fast_flag and li[i] in fast:
            t=fast[li[i]]
        else:
            t=score_func(tmodel)
        print(f'{li[i]}的得分：',t)
        weights.append((tnet.state_dict(),t,li[i]))

    device=torch.device('cuda:0')
    if mode=='avg':
        for i in range(1,len(li)):
            for k in weights[0][0].keys():
                weights[0][0][k]=weights[0][0][k].to(device)
                weights[0][0][k]+=weights[i][0][k].to(device)
        
        for k in  weights[0][0].keys():
            weights[0][0][k]/=len(li)
        
        net.load_state_dict(weights[0][0])
        print('平均化模型得分:',score_func(model))
        save_func(model)

    elif mode=='greedy':

        weights.sort(key=lambda x:x[1],reverse=True)
        best_score=weights[0][1]
        best_state_dict=weights[0][0]
        net.load_state_dict(best_state_dict)
        print(f'基础权重{weights[0][2]}，得分{best_score}')
        for i in range(1,len(weights)):
            t_state_dict=deepcopy(best_state_dict)
            for k in best_state_dict:
                t_state_dict[k]=t_state_dict[k].to(device)
                t_state_dict[k]+=weights[i][0][k].to(device)
                t_state_dict[k]/=2
            net.load_state_dict(t_state_dict)
            t_score=score_func(model)
            if t_score>best_score:
                best_score=t_score
                best_state_dict=t_state_dict
                print(f'融合{weights[i][2]}，得分{best_score}')
            else:
                print(weights[i][2],weights[i][1],t_score)

        print(f"贪婪汤最终得分：{best_score}")
        net.load_state_dict(best_state_dict)
        save_func(model)

    elif mode=='full':

        weights.sort(key=lambda x:x[1],reverse=True)
        all_best_score=weights[0][1]
        all_best_state_dict=weights[0][0]
        for ii in range(len(weights)-1):
            best_score=weights[ii][1]
            best_state_dict=weights[ii][0]
            net.load_state_dict(best_state_dict)
            print('!!!!!!!!!!!!')
            print(f'基础权重{weights[ii][2]}，得分{best_score}')
            for i in range(ii+1,len(weights)):
                t_state_dict=deepcopy(best_state_dict)
                for k in best_state_dict:
                    t_state_dict[k]=t_state_dict[k].to(device)
                    t_state_dict[k]+=weights[i][0][k].to(device)
                    t_state_dict[k]/=2
                net.load_state_dict(t_state_dict)
                t_score=score_func(model)
                if t_score>best_score:
                    best_score=t_score
                    best_state_dict=t_state_dict
                    print(f'融合{weights[i][2]}，得分{best_score}')
                else:
                    print(weights[i][2],weights[i][1],t_score)

            if best_score>all_best_score:
                print(f'update:{all_best_score}to{best_score}')
                all_best_state_dict=best_state_dict
                all_best_score=best_score
        print(f"贪婪汤最终得分：{best_score}")
        net.load_state_dict(all_best_state_dict)
        save_func(model)


def process_batch(detections, labels, iouv):
    """
    Return correct predictions matrix. Both sets of boxes are in (x1, y1, x2, y2) format.
    Arguments:
        detections (Array[N, 6]), x1, y1, x2, y2, conf, class
        labels (Array[M, 5]), class, x1, y1, x2, y2
    Returns:
        correct (Array[N, 10]), for 10 IoU levels
    """
    correct = torch.zeros(detections.shape[0], iouv.shape[0], dtype=torch.bool, device=iouv.device)
    iou = box_iou(labels[:, 1:], detections[:, :4])
    x = torch.where((iou >= iouv[0]) & (labels[:, 0:1] == detections[:, 5]))  # IoU above threshold and classes match
    if x[0].shape[0]:
        matches = torch.cat((torch.stack(x, 1), iou[x[0], x[1]][:, None]), 1).cpu().numpy()  # [label, detection, iou]
        if x[0].shape[0] > 1:
            matches = matches[matches[:, 2].argsort()[::-1]]
            matches = matches[np.unique(matches[:, 1], return_index=True)[1]]
            # matches = matches[matches[:, 2].argsort()[::-1]]
            matches = matches[np.unique(matches[:, 0], return_index=True)[1]]
        matches = torch.Tensor(matches).to(iouv.device)
        correct[matches[:, 1].long()] = matches[:, 2:3] >= iouv
    return correct


from utils.datasets import create_dataloader
from tqdm import tqdm
from utils.general import (LOGGER, box_iou, colorstr,  non_max_suppression, 
                           scale_coords, xywh2xyxy)
from utils.metrics import ConfusionMatrix, ap_per_class
from utils.yolov5_loss import ComputeLoss
@torch.no_grad()
def yolov5_score(model:torch.nn.Module,
        labels_and_imgs_path=_parent_dir, 
        batch_size=32,  # batch size
        imgsz=640,  # inference size (pixels)
        conf_thres=0.001,  # confidence threshold
        iou_thres=0.6,  # NMS IoU threshold
        workers=0,  # max dataloader workers (per RANK in DDP mode)
        augment=False,
        save_hybrid=False,
        nc=1,
        ):
    
    loss_func=ComputeLoss(model.model)


    device = torch.device('cpu')
    if torch.cuda.is_available():
        device = torch.device('cuda:0')
        model.model=model.model.cuda()
    stride, pt= model.stride, model.pt
    model.model.float()
    model.model.to(device)
    model.model.eval()
    iouv = torch.linspace(0.5, 0.95, 10).to(device)  # iou vector for mAP@0.5:0.95
    niou = iouv.numel()

    pad = 0.5
    rect = pt  # square inference for benchmarks
    dataloader = create_dataloader(labels_and_imgs_path, imgsz, batch_size, stride, False, pad=pad, rect=rect,
                                    workers=workers, prefix=colorstr('val: '))[0]
                                    
    loss = torch.zeros(3, device=device).cuda()
    dt, p, r, f1, mp, mr, map50, map = [0.0, 0.0, 0.0], 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    jdict, stats, ap, ap_class = [], [], [], []
    pbar = tqdm(dataloader)  # progress bar
    
    for batch_i, (im, targets, paths, shapes) in enumerate(pbar):
        im = im.to(device, non_blocking=True)
        targets = targets.to(device)

        im = im.float()  # uint8 to fp16/32
        im /= 255  # 0 - 255 to 0.0 - 1.0
        nb, _, height, width = im.shape  # batch size, channels, height, width

        # Inference
        out, train_out = model(im, augment=augment, val=True)  # inference, loss outputs

        loss += loss_func([x.float() for x in train_out], targets.to(device))[1].to(device)  # box, obj, cls
        # NMS
        targets[:, 2:] *= torch.Tensor([width, height, width, height]).to(device)  # to pixels
        lb = [targets[targets[:, 0] == i, 1:] for i in range(nb)] if save_hybrid else []  # for autolabelling
        # print(batch_i,'before nms',len(out))
        out = non_max_suppression(out, conf_thres, iou_thres, labels=lb, multi_label=True, agnostic=False)
        # print(batch_i,'after nms',len(out))

        # Metrics
        for si, pred in enumerate(out):
            labels = targets[targets[:, 0] == si, 1:]
            nl = len(labels)
            # print(labels,nl)
            tcls = labels[:, 0].tolist() if nl else []  # target class
            shape =  shapes[si][0]

            if len(pred) == 0:
                if nl:
                    stats.append((torch.zeros(0, niou, dtype=torch.bool), torch.Tensor(), torch.Tensor(), tcls))
                continue

            # Predictions
            predn = pred.clone()
            scale_coords(im[si].shape[1:], predn[:, :4], shape, shapes[si][1])  # native-space pred

            # Evaluate
            if nl:
                tbox = xywh2xyxy(labels[:, 1:5])  # target boxes
                scale_coords(im[si].shape[1:], tbox, shape, shapes[si][1])  # native-space labels
                labelsn = torch.cat((labels[:, 0:1], tbox), 1)  # native-space labels
                correct = process_batch(predn, labelsn, iouv)
            else:
                correct = torch.zeros(pred.shape[0], niou, dtype=torch.bool)
            stats.append((correct.cpu(), pred[:, 4].cpu(), pred[:, 5].cpu(), tcls))  # (correct, conf, pcls, tcls)
    # Compute metrics
    stats = [np.concatenate(x, 0) for x in zip(*stats)]  # to numpy
    if len(stats) and stats[0].any():
        print('...........')
        tp, fp, p, r, f1, ap, ap_class = ap_per_class(*stats, plot=False,names={})
        ap50, ap = ap[:, 0], ap.mean(1)  # AP@0.5, AP@0.5:0.95
        mp, mr, map50, map = p.mean(), r.mean(), ap50.mean(), ap.mean()
        nt = np.bincount(stats[3].astype(np.int64), minlength=nc)  # number of targets per class
    else:
        nt = torch.zeros(1)

    # Return results
    model.float()  # for training
    maps = np.zeros(nc) + map
    for i, c in enumerate(ap_class):
        maps[c] = ap[i]
    print((mp, mr, map50, map, *(loss.cpu() / len(dataloader)).tolist()), maps)
    # print((mp, mr, map50, map), maps)
    return mr*mp


def yolov5_save(model,output_path=_output_path):
    ckpt={
        'epoch': -1,
        'best_fitness': None,
        'ema': None,
        'updates': None,
        'optimizer': None, 
        'wandb_id': None, 
        'date': datetime.datetime.now().isoformat()
    }
    ckpt['model']=model.model
    torch.save(ckpt,output_path)

if __name__ == '__main__':
    soup('yolov5', 'MultiBackend',{},yolov5_score,yolov5_save)
